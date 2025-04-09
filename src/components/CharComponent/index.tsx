import {useEffect, useRef, useState} from 'react';
import ReactECharts from 'echarts-for-react';
import DataShow from "../DataShowComponent/index.jsx";
import {Button} from "antd";
import "./index.css";

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

function ChartComponent(): JSX.Element {
  // 存储当前 press_id
  const [currentPressId, setCurrentPressId] = useState<number | string | null>(null);
  // 存储绘图用的数据 [{ x: number, y: number }, ...]
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  // 存储数据，并传给子组件 DataShow
  const [childData, setChildData] = useState<Data>({
    position: 0,
    pressure: 0,
    displacement: 0,
  });
  // 使用 useRef 保存 WebSocket 实例
  const wsRef = useRef<WebSocket | null>(null);
  // 使用 useRef 存储数据缓存（如果需要的话，可以取消注释）
  // const dataCache = useRef<ChartDataPoint[]>([]);

  // 建立 WebSocket 连接
  useEffect(() => {
    // 注意替换为后端真实地址和端口
    wsRef.current = new WebSocket('ws://localhost:8080/ws');

    wsRef.current.onopen = () => {
      console.log('WebSocket 连接已建立');
    };

    wsRef.current.onmessage = (message: MessageEvent) => {
      try {
        // 从后端接收到的 JSON 数据
        const data: DataMessage = JSON.parse(message.data);

        // data 结构示例: { press_id, position, pressure, displacement }
        const {press_id, position, pressure, displacement} = data;
        // 更新传递给子组件的数据
        setChildData({
          position,
          pressure,
          displacement,
        });

        // 如果 press_id 改变，则清空数据并更新 currentPressId
        if (press_id !== currentPressId) {
          setCurrentPressId(press_id);
          // 同时清空 chartData，直接初始化一个新的数据点
          // dataCache.current = [{ position, pressure }];
          setChartData([{position, pressure}]);
        } else {
          // 如果 press_id 没变，则追加数据到 chartData 中
          setChartData((prevData) => [...prevData, {position, pressure}]);
          // 如果 press_id 没变，则将数据添加到缓存中
          // dataCache.current.push({ position, pressure });
        }
      } catch (error) {
        console.error('JSON 解析失败:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket 连接已关闭');
    };

    // 清理函数，组件卸载时关闭连接
    return () => {
      wsRef.current?.close();
    };
    // 这里依赖 currentPressId，如果希望只在组件加载时建立连接可以调整依赖数组
  }, [currentPressId]);

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

  // 点击按钮时发送 WebSocket 消息
  const handleSendMessage = (): void => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {type: 'button_click', timestamp: Date.now()};
      wsRef.current.send(JSON.stringify(message));
      console.log('消息已发送:', message);
    } else {
      console.log('WebSocket 连接尚未建立');
    }
  };

  // 配置 ECharts
  const getOption = () => {
    return {
      title: {
        text: 'Position - Pressure 实时曲线',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'value',
        name: 'Position',
        max: 1000,
      },
      yAxis: {
        type: 'value',
        name: 'Pressure',
        min: -10000,
        max: 10000,
      },
      series: [
        {
          name: 'Press Curve',
          type: 'line',
          smooth: true,
          data: chartData.map((item) => [item.position, item.pressure]),
        },
      ],
    };
  };

  return (
    <div className="charComponent">
      <div className="dataShow" style={{width: '800px', height: '600px'}}>
        <DataShow data={childData}/>
        <ReactECharts option={getOption()} style={{height: '100%', width: '100%'}}/>
      </div>
      <div className="changeLED" style={{marginBottom: '10px'}}>
        <Button onClick={handleSendMessage}>发送 WebSocket 消息</Button>
      </div>
    </div>
  );
}

export default ChartComponent;
