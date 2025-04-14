import { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import DataShow from "../DataShowComponent/index.jsx";
import { Button, Input, message } from "antd";
import "./index.css";
import axios from "axios";

// 定义从后端接收的数据结构
interface Data {
  position: number;
  pressure: number;
  displacement: number;
}

// 定义图表数据点的结构
interface ChartDataPoint {
  position: number;
  pressure: number;
}

// 定义从后端接收的数据结构（如果需要使用 press_id，可扩展接口）
interface DataMessage extends Data {
  press_id: number | string;
}

// 定义连接参数的类型
interface ConnectionParams {
  ip: string;
  port: string;
}

function ChartComponent(): JSX.Element {
  // 存储当前 press_id
  const [currentPressId, setCurrentPressId] = useState<number | string | null>(
    null
  );
  // 存储绘图用的数据 [{ x: number, y: number }, ...]
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  // 存储数据，并传给子组件 DataShow
  const [childData, setChildData] = useState<Data>({
    position: 0,
    pressure: 0,
    displacement: 0,
  });
  // 初始化（Modbus TCP从站）连接参数
  const [connectionParams, setConnectionParams] = useState<ConnectionParams>({
    ip: "192.168.2.89",
    port: "502",
  });
  // 初始化状态
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  // 使用 useRef 保存 WebSocket 实例
  const wsRef = useRef<WebSocket | null>(null);
  const isTestingRef = useRef(isTesting);
  const currentPressIdRef = useRef<number | string | null>(null);
  // 使用 useRef 存储数据缓存（如果需要的话，可以取消注释）
  // const dataCache = useRef<ChartDataPoint[]>([]);

  // 同步isTestingRef的值
  useEffect(() => {
    isTestingRef.current = isTesting;
    // console.log("isTesting changed to:", isTesting);
  }, [isTesting]);

  // 同步 currentPressIdRef
  useEffect(() => {
    currentPressIdRef.current = currentPressId;
    // console.log("currentPressId changed to:", currentPressId);
  }, [currentPressId]);

  // 处理输入框变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof ConnectionParams
  ) => {
    setConnectionParams((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  // 连接/断开 WebSocket
  const toggleConnection = async () => {
    if (isConnected) {
      wsRef.current?.close();
      setIsConnected(false);
      setIsTesting(false);
      try {
        const response = await axios.get(
          `http://localhost:8080/closeModbusServer`
        );
        if (response.status === 200) {
          message.success("删除数据成功");
        } else {
          message.error("删除数据失败");
        }
      } catch (error) {
        console.error("发送Modbus连接请求失败:", error);
        message.error("请求发送失败" + error);
      }
    } else {
      connectWebSocket();
    }
  };

  // 开始/停止测试
  const toggleTesting = () => {
    // console.log("toggleTesting called, current isTesting:", isTesting);
    if (!isConnected) {
      message.warning("请先连接WebSocket");
      return;
    }
    message.success("开始/停止测试");
    setIsTesting((prev) => !prev);
  };

  // 连接WebSocket
  const connectWebSocket = () => {
    try {
      const wsUrl = `ws://localhost:8080/ws`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket 连接已建立");
        setIsConnected(true);
        message.success("WebSocket连接成功");

        // 连接成功后自动发送Modbus连接请求
        sendModbusConnection();
      };

      wsRef.current.onmessage = (messageEvent) => {
        // console.log("-----------" + isTestingRef.current);

        if (!isTestingRef.current) return; // 如果不在测试状态，不处理数据

        try {
          const data: DataMessage = JSON.parse(messageEvent.data);
          const { press_id, position, pressure, displacement } = data;

          // console.log("接收到数据:", data);

          setChildData({ position, pressure, displacement });

          if (press_id !== currentPressIdRef.current) {
            // console.log("press_id 变化，清除 chartData");
            setCurrentPressId(press_id);
            // console.log("currentPressId 更新为:", currentPressId);
            setChartData([{ position, pressure }]);
          } else {
            // console.log("press_id 未变，追加数据");
            // setChartData((prev) => [...prev, { position, pressure }]);
            setChartData((prev) => {
              const newData = [...prev, { position, pressure }];
              // console.log("chartData 更新为:", newData);
              return newData;
            });
          }
        } catch (error) {
          console.error("JSON解析失败:", error);
        }
      };

      wsRef.current.onclose = () => {
        // console.log("WebSocket 连接已关闭");
        setIsConnected(false);
        setIsTesting(false);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket错误:", error);
        message.error("连接失败，请检查地址和端口");
      };
    } catch (error) {
      console.error("创建WebSocket失败:", error);
      message.error("创建连接失败");
    }
  };

  // 发送Modbus连接信息到后端（axios POST）
  const sendModbusConnection = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8080/connectModbusServer`,
        {
          ip: connectionParams.ip, // Modbus设备IP
          port: connectionParams.port, // Modbus端口
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        message.success("Modbus连接成功");
      } else {
        message.error("Modbus连接失败");
      }
    } catch (error) {
      console.error("发送Modbus连接请求失败:", error);
      message.error("请求发送失败");
    }
  };

  // // 建立 WebSocket 连接
  // useEffect(() => {
  //   // 注意替换为后端真实地址和端口
  //   wsRef.current = new WebSocket("ws://localhost:8080/ws");

  //   wsRef.current.onopen = () => {
  //     console.log("WebSocket 连接已建立");
  //   };

  //   wsRef.current.onmessage = (message: MessageEvent) => {
  //     try {
  //       // 从后端接收到的 JSON 数据
  //       const data: DataMessage = JSON.parse(message.data);

  //       // data 结构示例: { press_id, position, pressure, displacement }
  //       const { press_id, position, pressure, displacement } = data;
  //       // 更新传递给子组件的数据
  //       setChildData({
  //         position,
  //         pressure,
  //         displacement,
  //       });

  //       // 如果 press_id 改变，则清空数据并更新 currentPressId
  //       if (press_id !== currentPressId) {
  //         setCurrentPressId(press_id);
  //         // 同时清空 chartData，直接初始化一个新的数据点
  //         // dataCache.current = [{ position, pressure }];
  //         setChartData([{ position, pressure }]);
  //       } else {
  //         // 如果 press_id 没变，则追加数据到 chartData 中
  //         setChartData((prevData) => [...prevData, { position, pressure }]);
  //         // 如果 press_id 没变，则将数据添加到缓存中
  //         // dataCache.current.push({ position, pressure });
  //       }
  //     } catch (error) {
  //       console.error("JSON 解析失败:", error);
  //     }
  //   };

  //   wsRef.current.onclose = () => {
  //     console.log("WebSocket 连接已关闭");
  //   };

  //   // 清理函数，组件卸载时关闭连接
  //   return () => {
  //     wsRef.current?.close();
  //   };
  //   // 这里依赖 currentPressId，如果希望只在组件加载时建立连接可以调整依赖数组
  // }, [currentPressId]);

  // 定时器：如果需要定时合并缓存中的数据到 chartData，可以取消注释下面代码
  /*
  useEffect(() => {
      const timer = setInterval(() => {
          if (dataCache.current.length > 0) {
              // 将缓存数据合并到 chartData 中
              setChartData((prevData) => [...prevData, ...dataCache.current]);
              // 清空缓存
              dataCache.current = [];
          }
      }, 30);
      return () => clearInterval(timer);
  }, []);
  */

  // 发送测试消息
  const handleSendMessage = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = { type: "button_click", timestamp: Date.now() };
      wsRef.current.send(JSON.stringify(data));
      console.log("消息已发送:", data);
      message.success("消息已发送");
    } else {
      message.warning("WebSocket未连接");
    }
  };

  // 清理WebSocket
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // 配置 ECharts
  const getOption = () => {
    const seriesData = chartData.map((item) => [item.position, item.pressure]);
    console.log("ECharts series data:", seriesData);
    return {
      title: {
        text: "Position - Pressure 实时曲线",
      },
      tooltip: {
        trigger: "axis",
      },
      xAxis: {
        type: "value",
        name: "Position",
        max: 1000,
      },
      yAxis: {
        type: "value",
        name: "Pressure",
        min: -10000,
        max: 10000,
      },
      series: [
        {
          name: "Press Curve",
          type: "line",
          smooth: true,
          data: seriesData,
        },
      ],
    };
  };

  return (
    <div className="charComponent">
      <div className="dataShow" style={{ width: "800px", height: "600px" }}>
        <DataShow data={childData} />
        <ReactECharts
          option={getOption()}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
      <div className="changeLED" style={{ marginBottom: "10px" }}>
        <Button onClick={handleSendMessage}>发送 WebSocket 消息</Button>
        <div className="connection-controls" style={{ marginBottom: 16 }}>
          <Input
            placeholder="IP地址"
            value={connectionParams.ip}
            onChange={(e) => handleInputChange(e, "ip")}
            style={{ width: 150, marginRight: 8 }}
          />
          <Input
            placeholder="端口"
            value={connectionParams.port}
            onChange={(e) => handleInputChange(e, "port")}
            style={{ width: 100, marginRight: 8 }}
          />
          <Button
            type={isConnected ? "default" : "primary"}
            onClick={toggleConnection}
            style={{ marginRight: 8 }}
          >
            {isConnected ? "断开连接" : "连接WebSocket"}
          </Button>
          <Button
            type={isTesting ? "default" : "primary"}
            onClick={toggleTesting}
            disabled={!isConnected}
          >
            {isTesting ? "停止测试" : "开始测试"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChartComponent;
