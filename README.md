# electron-demo-dst

该项目旨在使用 Electron 将前后端统一打包成安装包，并兼容 32 位操作系统。前端采用 React 和 TypeScript，后端使用 Golang。 :contentReference[oaicite:0]{index=0}

## 项目结构

```plaintext
electron-demo-dst/
├── dist-electron/           # Electron 打包输出目录
├── electron/               # Electron 主进程代码
├── go-server/              # Golang 后端代码
├── public/                # 公共资源目录
├── resource/              # 资源目录
│   └── go-server/         # Golang 服务器资源
│       └── win32-amd64/  # Windows 32 位资源
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
- 前端：React、TypeScript、Vite、node(20.19.0)
- 后端：​Golang(1.24.2)
- 构建工具：​Electron、Electron-builder

## 功能特性
- 使用 Electron 将前后端代码打包成可安装包，支持 32 位操作系统。
- 前端采用 React 和 TypeScript，提供高效的开发体验。
- 后端使用 Golang，确保高性能和可靠性。

## 开发指南
1. 安装依赖：使用 npm 或 yarn 安装依赖。
```nodejs
npm install
```
2. 开发模式启动：
```nodejs
npm run dev
```

3. 构建项目：
```nodejs
npm run build
```
4. 运行 Electron：
```nodejs
npm run electron
```

# 贡献指南
欢迎提交 Issues 和 Pull Requests。请确保您的代码符合项目的编码规范，并通过了所有测试。

# 联系方式
作者：Spongzi

GitHub：https://github.com/Spongzi

更多详细信息，请参阅 项目主页。
