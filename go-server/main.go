package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/goburrow/modbus"
	"github.com/gorilla/websocket"
)

// 定义数据结构
type SensorData struct {
	PressID      int32 `json:"press_id"`     // 压装 ID (地址 1)
	Position     int32 `json:"position"`     // 位置 (地址 3)
	Pressure     int32 `json:"pressure"`     // 压力 (地址 5)
	Displacement int32 `json:"displacement"` // 位移速度 (地址 7)
}

// WebSocket 升级器
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, // 允许所有来源
}

// 全局 Modbus 客户端
var modbusClient modbus.Client

// 存储所有 WebSocket 连接
var clients = make(map[*websocket.Conn]bool)

var sync = 1

func main() {
	// 初始化 Modbus 连接
	ip, err := GetOutBoundIP()
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(ip)
	handler := modbus.NewTCPClientHandler(ip + ":502") // 替换为实际地址
	//handler := modbus.NewTCPClientHandler("127.0.0.1" + ":502") // 替换为实际地址
	handler.Timeout = 50 * time.Millisecond
	handler.SlaveId = 1

	err = handler.Connect()
	if err != nil {
		log.Fatalf("Modbus 连接失败: %v", err)
	}
	defer handler.Close()

	modbusClient = modbus.NewClient(handler)

	// 初始化 Gin
	r := gin.Default()

	// WebSocket 路由
	r.GET("/ws", handleWebSocket)

	// 启动数据读取和广播的 goroutine
	go broadcastData()

	// 启动服务
	log.Println("服务启动在 :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Gin 服务启动失败: %v", err)
	}
}

// 处理 WebSocket 连接
func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket 升级失败: %v", err)
		return
	}
	defer conn.Close()

	// 添加客户端到列表
	clients[conn] = true
	defer delete(clients, conn)

	// 启动一个 goroutine 用于接收消息
	go func(conn *websocket.Conn) {
		defer func() {
			conn.Close()
			delete(clients, conn)
		}()
		for {
			// 读取消息，messageType 在此示例中未使用
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("读取 WebSocket 消息失败: %v", err)
				break
			}
			// 处理接收到的消息，比如打印消息内容
			log.Printf("接收到消息: %s", string(message))

			// 根据消息内容进行不同的处理逻辑
			// 例如，如果消息类型为 "button_click" 则做特定处理
			var clientMsg map[string]interface{}
			if err := json.Unmarshal(message, &clientMsg); err == nil {
				if clientMsg["type"] == "button_click" {
					log.Println("收到按钮点击事件")
					// 这里可以执行相关逻辑
					// 上锁
					sync = 0
					fmt.Println("进行写操作")
					sendCustomCommand()
					// 解锁
					sync = 1
					fmt.Println("写操作完成")
				}
			}
		}
	}(conn)

	// 保持连接开放
	for {
		time.Sleep(1 * time.Second) // 防止 goroutine 退出
	}
}

// 广播数据到所有客户端
func broadcastData() {
	pollInterval := 30 * time.Millisecond
	for {
		// 读取 Modbus 数据
		if sync != 0 {
			data, err := readModbusData()
			if err != nil {
				log.Printf("读取 Modbus 数据失败: %v", err)
				time.Sleep(pollInterval)
				continue
			}
			// 转换为 JSON
			jsonData, err := json.Marshal(data)
			if err != nil {
				log.Printf("JSON 编码失败: %v", err)
				continue
			}

			// 广播给所有客户端
			for clientConn := range clients {
				err = clientConn.WriteMessage(websocket.TextMessage, jsonData)
				if err != nil {
					log.Printf("WebSocket 发送失败: %v", err)
					clientConn.Close()
					delete(clients, clientConn)
				}
			}
		} else {
			fmt.Println("我被上锁了，读取不了数据")
		}
		time.Sleep(pollInterval)
	}
}

// 读取 Modbus 数据
func readModbusData() (SensorData, error) {
	// 读取从地址 1 到 8 的 8 个寄存器
	results, err := modbusClient.ReadHoldingRegisters(0, 8)
	if err != nil {
		return SensorData{}, err
	}

	// 解析数据
	data := SensorData{
		PressID:      int32(binary.BigEndian.Uint32(results[0:4])),
		Position:     int32(binary.BigEndian.Uint32(results[4:8])),
		Pressure:     int32(binary.BigEndian.Uint32(results[8:12])),
		Displacement: int32(binary.BigEndian.Uint32(results[12:16])),
	}

	//fmt.Println(results)

	//fmt.Println("ID: ", data.PressID,
	//	"Position: ", data.Position,
	//	"Pressure: ", data.Pressure,
	//	"Displacement: ", data.Displacement)
	return data, nil
}

func GetOutBoundIP() (string, error) {
	conn, err := net.Dial("udp", "8.8.8.8:53")
	if err != nil {
		return "", err
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	ip := strings.Split(localAddr.String(), ":")[0]
	return ip, nil
}

func sendCustomCommand() {
	// 起始地址为 0x0100 (256)，写入 1 个寄存器，数据为 0x0001（2 字节）
	address := uint16(0x0100)
	quantity := uint16(1)
	data := []byte{0x00, 0x01}

	result, err := modbusClient.WriteMultipleRegisters(address, quantity, data)
	if err != nil {
		log.Fatalf("发送指令失败: %v", err)
	}
	fmt.Printf("发送指令成功，返回数据: % x\n", result)
}
