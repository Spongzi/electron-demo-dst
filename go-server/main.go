package main

import (
	"encoding/binary"
	"encoding/json"
	"errors"
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

type modbusClinetStruct struct {
	Ip   string `json:"ip"`
	Port string `json:"port"`
}

// 全局 Modbus 客户端
var modbusClient modbus.Client
var modbusHandler *modbus.TCPClientHandler

// 存储所有 WebSocket 连接
var clients = make(map[*websocket.Conn]bool)

// 添加停止通道
var stopBroadcast = make(chan struct{})

func Cors() gin.HandlerFunc {
	return func(context *gin.Context) {
		method := context.Request.Method
		context.Header("Access-Control-Allow-Origin", "*")
		context.Header("Access-Control-Allow-Headers", "Content-Type,AccessToken,X-CSRF-Token, Authorization, Token")
		context.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		context.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Content-Type")
		context.Header("Access-Control-Allow-Credentials", "true")
		if method == "OPTIONS" {
			context.AbortWithStatus(http.StatusNoContent)
		}
		context.Next()
	}
}

func main() {

	// 初始化 Gin
	r := gin.Default()

	r.Use(Cors())

	r.POST("/connectModbusServer", connectModbusServer)

	// WebSocket 路由
	r.GET("/ws", handleWebSocket)

	// 关闭WebSocket和Modbus
	r.GET("/closeModbusServer", closeModbusServer)

	// 启动服务
	log.Println("服务启动在 :8080")
	if err := r.Run(":8080"); err != nil {
		log.Printf("Gin 服务启动失败: %v", err)
	}
}

func initModbusClient(ip string, port string) {
	// 初始化 Modbus 连接
	// ip, err := GetOutBoundIP()
	// if err != nil {
	// 	fmt.Println(err)
	// 	return
	// }
	if port == "" {
		port = "502"
	}
	fmt.Println(ip)
	// handler := modbus.NewTCPClientHandler(ip + ":" + port) // 替换为实际地址
	// //handler := modbus.NewTCPClientHandler("127.0.0.1" + ":502") // 替换为实际地址
	// // handler.Timeout = 50 * time.Millisecond
	// handler.Timeout = 1 * time.Second
	// handler.SlaveId = 1

	modbusHandler = modbus.NewTCPClientHandler(ip + ":" + port)
	modbusHandler.Timeout = 1 * time.Second
	modbusHandler.SlaveId = 1

	err := modbusHandler.Connect()
	if err != nil {
		log.Printf("Modbus 连接失败: %v", err)
		return
	}
	// defer modbusHandler.Close()

	// 启动数据读取和广播的 goroutine
	go broadcastData()

	modbusClient = modbus.NewClient(modbusHandler)
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
					fmt.Println("进行写操作")
					sendCustomCommand()
					// 解锁
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

func closeModbusServer(ctx *gin.Context) {
	// 停止 broadcastData goroutine
	close(stopBroadcast) // 发送停止信号
	// 关闭 Modbus 连接
	if modbusHandler != nil {
		err := modbusHandler.Close()
		if err != nil {
			log.Printf("关闭 Modbus 连接失败: %v", err)
		} else {
			log.Println("Modbus 连接已关闭")
		}
		modbusHandler = nil
	}

	// 关闭所有 WebSocket 连接
	for clientConn := range clients {
		err := clientConn.Close()
		if err != nil {
			log.Printf("关闭 WebSocket 连接失败: %v", err)
		} else {
			log.Println("WebSocket 连接已关闭")
		}
		delete(clients, clientConn)
	}

	stopBroadcast = make(chan struct{}) // 重置通道

	ctx.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "Modbus 和 WebSocket 已关闭",
	})
}

func connectModbusServer(ctx *gin.Context) {
	fmt.Println("进入函数")
	modbusClinetStruct := modbusClinetStruct{}
	// 绑定前端数据
	ctx.BindJSON(&modbusClinetStruct)
	if modbusClinetStruct.Ip == "" {
		fmt.Println("ip为空")
	} else {
		initModbusClient(modbusClinetStruct.Ip, modbusClinetStruct.Port)
		fmt.Println("ip不为空")
	}
	ctx.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "连接成功",
	})
}

// 广播数据到所有客户端
func broadcastData() {
	pollInterval := 30 * time.Millisecond
	for {
		select {
		case <-stopBroadcast: // 监听停止信号
			log.Println("停止广播数据")
			return // 退出 goroutine
		default:
			// 读取 Modbus 数据
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
			fmt.Println(jsonData)

			// 广播给所有客户端
			for clientConn := range clients {
				err = clientConn.WriteMessage(websocket.TextMessage, jsonData)
				if err != nil {
					log.Printf("WebSocket 发送失败: %v", err)
					clientConn.Close()
					delete(clients, clientConn)
				}
			}
			time.Sleep(pollInterval)
		}
	}
}

// 读取 Modbus 数据
func readModbusData() (SensorData, error) {
	// 读取从地址 1 到 8 的 8 个寄存器
	if modbusHandler == nil {
		return SensorData{}, errors.New("modbusHandler is nil")
	}
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

	// fmt.Println(results)

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
		log.Printf("发送指令失败: %v", err)
	}
	fmt.Printf("发送指令成功，返回数据: % x\n", result)
}
