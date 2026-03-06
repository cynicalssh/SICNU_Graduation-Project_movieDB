# 微信小程序电影推荐系统 - 后端服务

Spring Boot 后端项目

## 运行项目

### 方式1：使用IDE运行（推荐）

**IntelliJ IDEA:**
1. 打开项目文件夹
2. 等待IDEA自动下载依赖
3. 运行 `MovieBackendApplication.java` 的 main 方法

**Eclipse:**
1. Import -> Existing Maven Projects
2. 选择项目文件夹
3. 运行 `MovieBackendApplication.java`

### 方式2：使用Maven命令行

如果已安装Maven：
```bash
cd movie-backend
mvn spring-boot:run
```

**注意：** 如果提示找不到 `mvn` 命令，请先安装Maven或使用IDE运行。

详细说明请查看：`运行说明.md`

## 验证运行

项目启动后，访问：`http://localhost:8080/test`

如果返回 "Spring Boot 项目启动成功！"，说明项目运行正常。

## 微信登录功能

### 1. 配置小程序信息（可选）

**方式1：使用测试模式（推荐用于测试号）**

直接运行即可，无需配置。系统会自动使用测试模式，根据code生成模拟的openid。

**方式2：配置正式AppID和Secret**

编辑 `src/main/resources/application.yml`：

```yaml
wechat:
  appid: your_appid      # 替换为你的小程序AppID
  secret: your_secret    # 替换为你的小程序AppSecret
```

如果不配置，系统会自动使用测试模式。

### 2. 接口说明

**登录接口：** `POST /auth/wechat/login`

**请求：**
```json
{
  "code": "微信小程序wx.login()获取的code"
}
```

**响应：**
```json
{
  "token": "生成的UUID token",
  "openId": "微信openId",
  "userId": 1
}
```

详细说明请查看：`微信登录接口说明.md`

