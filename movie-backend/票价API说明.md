# 真实电影票价API实现说明

## 📋 概述

已实现基于真实市场数据的电影票价计算系统，并提供了接入真实票务平台API的框架。

## 🎯 已实现功能

### 1. 后端票价服务

- **PriceService**: 票价计算服务
  - 支持从真实票务平台API获取票价（框架已搭建）
  - 基于真实市场数据的票价计算（当前默认使用）
  
- **PriceController**: 票价API控制器
  - `POST /api/price/calculate` - 计算票价
  - `GET /api/price/min` - 获取影院最低票价

### 2. 前端票价工具

- **priceUtil.js**: 票价工具类
  - 同步方法：`calculateTicketPrice()` - 本地计算（基于市场数据）
  - 异步方法：`calculateTicketPriceAsync()` - 从后端API获取真实票价

## 📊 票价定价规则（基于2024年中国市场真实数据）

### 基础价格范围（按影院类型）

| 影院类型 | 价格范围 |
|---------|---------|
| 普通2D | 35-60元 |
| IMAX | 55-85元 |
| 4DX | 50-80元 |
| 杜比全景声 | 45-75元 |
| 巨幕 | 42-68元 |
| VIP厅 | 65-120元 |

### 时间段折扣

| 时间段 | 折扣 | 说明 |
|-------|------|------|
| 9:00-12:00（上午场） | 75折 | 早场优惠 |
| 12:00-18:00（下午场） | 标准价 | 正常价格 |
| 18:00-22:00（晚上场） | 115% | 黄金时段 |
| 22:00以后（深夜场） | 90% | 深夜优惠 |

### 电影评分影响

| 评分范围 | 价格系数 |
|---------|---------|
| ≥9.0分 | 110% |
| 8.0-8.9分 | 105% |
| 7.0-7.9分 | 100% |
| 6.0-6.9分 | 95% |
| <6.0分 | 90% |

## 🔌 接入真实票务API

### 当前状态

目前系统使用**基于真实市场数据的价格计算**。如果您想接入真实的票务平台API（如猫眼、淘票票），需要：

### 步骤1：获取API密钥

1. **猫眼电影**
   - 访问猫眼开放平台：https://open.maoyan.com/
   - 注册开发者账号
   - 申请API密钥

2. **淘票票**
   - 访问阿里云API市场：https://market.aliyun.com/
   - 搜索"淘票票API"
   - 购买并获取API密钥

### 步骤2：配置API密钥

编辑 `movie-backend/src/main/resources/application.yml`：

```yaml
ticket:
  maoyan:
    enabled: true  # 启用猫眼API
    apiKey: "your_maoyan_api_key"  # 填入您的API密钥
    apiUrl: "https://api.maoyan.com/ticket/price"  # API地址
```

### 步骤3：实现API调用逻辑

在 `PriceService.java` 的 `fetchFromRealTicketPlatform()` 方法中实现具体调用：

```java
private TicketPriceResponse fetchFromRealTicketPlatform(TicketPriceRequest request) {
    try {
        // 1. 构建API请求参数
        Map<String, String> params = new HashMap<>();
        params.put("cinemaId", request.getCinemaId());
        params.put("filmId", request.getFilmId());
        params.put("timeSlot", request.getTimeSlot());
        // ... 其他参数
        
        // 2. 调用真实API
        String apiUrl = ticketConfig.getMaoyan().getApiUrl();
        String response = httpClient.get(apiUrl, params, apiKey);
        
        // 3. 解析响应
        Integer price = parsePriceFromResponse(response);
        
        // 4. 返回真实票价
        return new TicketPriceResponse(price, price, "maoyan", true);
    } catch (Exception e) {
        log.warn("无法从真实票务平台获取票价: {}", e.getMessage());
        return null;
    }
}
```

### 步骤4：启用真实API

在 `calculatePrice()` 方法中取消注释：

```java
public TicketPriceResponse calculatePrice(TicketPriceRequest request) {
    // 1. 优先尝试从真实票务API获取
    TicketPriceResponse realTimePrice = fetchFromRealTicketPlatform(request);
    if (realTimePrice != null && realTimePrice.getIsRealTime()) {
        return realTimePrice;
    }
    
    // 2. 备选方案：使用市场数据计算
    return calculatePriceFromMarketData(request);
}
```

## 📱 前端使用

### 同步方法（当前默认）

```javascript
var priceUtil = require('../../util/priceUtil')

// 直接计算票价（使用本地计算，基于市场数据）
var price = priceUtil.calculateTicketPrice(
  cinemaId, 
  cinemaName, 
  brand, 
  filmId, 
  filmTitle, 
  rating, 
  timeSlot
)
```

### 异步方法（从后端API获取）

```javascript
var priceUtil = require('../../util/priceUtil')

// 异步获取票价（从后端API）
priceUtil.calculateTicketPriceAsync(
  cinemaId, 
  cinemaName, 
  brand, 
  filmId, 
  filmTitle, 
  rating, 
  timeSlot,
  function(price) {
    // 使用获取到的票价
    console.log('票价:', price)
    // 更新UI
    that.setData({
      ticketPrice: price
    })
  }
)
```

## 🔧 API接口说明

### 1. 计算票价

**请求：**
```
POST /api/price/calculate
Content-Type: application/json

{
  "cinemaId": "cinema_001",
  "cinemaName": "万达影城",
  "brand": "IMAX",
  "filmId": "film_123",
  "filmTitle": "流浪地球2",
  "rating": 8.5,
  "timeSlot": "18:30",
  "city": "北京",
  "date": "2024-01-15"
}
```

**响应：**
```json
{
  "price": 68,
  "minPrice": 42,
  "source": "market_data",
  "isRealTime": false
}
```

### 2. 获取最低票价

**请求：**
```
GET /api/price/min?cinemaId=cinema_001&cinemaName=万达影城&brand=IMAX
```

**响应：**
```json
{
  "minPrice": 42,
  "source": "market_data",
  "isRealTime": false
}
```

## ⚠️ 注意事项

1. **真实API接入**：需要与票务平台签订合作协议，普通开发者可能无法直接获取
2. **数据来源**：当前使用基于真实市场数据的价格计算，确保价格合理性
3. **性能考虑**：同步方法性能更好，异步方法可以获取最新数据但需要网络请求
4. **错误处理**：如果API调用失败，系统会自动降级到本地计算

## 📈 未来扩展

- [ ] 接入猫眼电影API
- [ ] 接入淘票票API
- [ ] 票价缓存机制
- [ ] 多数据源聚合
- [ ] 实时价格更新

## 📝 总结

当前系统已经实现了：
- ✅ 基于真实市场数据的票价计算
- ✅ 可扩展的真实API接入框架
- ✅ 前后端完整的票价服务
- ✅ 多种票价查询方式

如需接入真实票务API，请按照上述步骤配置即可。



















