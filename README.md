# electron-demo-dst

该项目旨在使用 Electron 将前后端统一打包成安装包，并兼容 32 位操作系统。前端采用 React 和 TypeScript，后端使用 Golang。

## 项目结构

```plaintext
electron-demo-dst/
├── dist-electron/          # Electron 打包输出目录
├── electron/               # Electron 主进程代码
├── go-server/              # Golang 后端代码
├── public/                 # 公共资源目录
├── release/                # 打包安装包目录
├── resource/               # 资源目录
│   └── go-server/          # Golang 服务器资源
│       └── ia32/  			# Windows 32 位后端程序
│       └── amd64/  		# Windows 64 位后端程序
├── src/                   # 前端源代码
├── .eslintrc.cjs          # ESLint 配置文件
├── .gitignore            # Git 忽略文件
├── .npmrc                # NPM 配置文件
├── README.md              # 项目说明文件
├── electron-builder.json5 # Electron 构建配置文件
├── index.html             # HTML 入口文件
├── package-lock.json      # NPM 锁定文件
├── package.json           # NPM 配置文件
├── tsconfig.json          # TypeScript 配置文件
├── tsconfig.node.json     # Node.js 类型定义文件
└── vite.config.ts         # Vite 配置文件
```

## 技术栈
- 前端：React、TypeScript、Vite、node
- 后端：​Golang
- 构建工具：​Electron、Electron-builder

## 功能特性
- 使用 Electron 将前后端代码打包成安装包或免安装版，支持 32 位操作系统。
- 前端采用 React 和 TypeScript，提供高效的开发体验。
- 后端使用 Golang，确保高性能和可靠性。

## 开发指南

### 环境搭建

- 后端
  1. 安装go编译器：[go1.24.2.windows-amd64.msi](https://go.dev/dl/go1.24.2.windows-amd64.msi)
  2. 修改GOPATH：[Go修改设置GOPATH](https://blog.csdn.net/feikillyou/article/details/109767375)
  3. 配置国内镜像源：[[Go]配置国内镜像源](https://blog.csdn.net/malu_record/article/details/133820642)

- 前端
  1. 安装node：[node v20.19.0 (LTS)-x64.msi](https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi)
  2. 更改 npm 的默认缓存地址：[更改 npm的默认缓存地址](https://blog.csdn.net/qq_34004088/article/details/134304547)
- vscode（也可以用Goland）
  1. 安装go插件

### 运行后端

在 `go-server` 文件夹下，打开终端：

1. 直接执行

```
go run .\main.go	# 第一次运行前会先安装依赖包
```

2. 编译成二进制再运行

```
go build .\main.go 	# 按默认设置编译
GOOS=windows GOARCH=386 go build .\main.go		# 编译为 Windows 32 位
GOOS=windows GOARCH=amd64 go build .\main.go	# 编译为 Windows 64 位
.\main.exe			# 执行编译后的程序
```

### 运行前端

在根目录下，打开终端：

1. 安装依赖：使用 npm 或 yarn 安装依赖（根据package.json）。
```nodejs
npm install
```
2. 开发模式启动：
```nodejs
npm run dev
```

3. 构建项目：
```nodejs
npm run build	# 打包前后端为一个可执行程序，包括32位和64位两个版本， 在release文件夹中
```
## 注意事项

1、打包前以管理员身份打开cmd，否则可能会报错。

2、打包时会生成32位和64位的后端 `.exe`  文件在 `resource/go-server` 中，最后再拷贝到最终的打包程序里面。

3、打包完成后会在 `release` 文件夹中生成：ia32免安装版、x64免安装版、ia32安装版、x64安装版 和 自动识别合适版本的安装程序。

# 贡献指南

欢迎提交 Issues 和 Pull Requests。请确保您的代码符合项目的编码规范，并通过了所有测试。

# 联系方式
作者：Spongzi

GitHub：https://github.com/Spongzi

更多详细信息，请参阅 项目主页。
