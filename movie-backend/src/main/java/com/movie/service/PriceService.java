package com.movie.service;

import com.movie.dto.TicketPriceRequest;
import com.movie.dto.TicketPriceResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 票价服务
 * 用于获取真实的电影票价
 * 
 * 注意：真实票价API需要与票务平台（如猫眼、淘票票）签订合作协议并获取API密钥
 * 当前实现提供了可扩展的框架，以及基于真实市场价格的备选方案
 */
@Service
public class PriceService {

    private static final Logger log = LoggerFactory.getLogger(PriceService.class);

    /**
     * 计算票价
     * 
     * 优先级：
     * 1. 尝试从真实票务API获取（需要配置API密钥）
     * 2. 如果API不可用，使用基于真实市场数据的价格计算
     * 
     * @param request 票价查询请求
     * @return 票价响应
     */
    public TicketPriceResponse calculatePrice(TicketPriceRequest request) {
        log.info("计算票价: cinema={}, film={}, timeSlot={}", 
                request.getCinemaName(), request.getFilmTitle(), request.getTimeSlot());

        // TODO: 1. 优先尝试从真实票务API获取
        // TicketPriceResponse realTimePrice = fetchFromRealTicketPlatform(request);
        // if (realTimePrice != null && realTimePrice.getIsRealTime()) {
        //     return realTimePrice;
        // }

        // 2. 使用基于真实市场数据的价格计算（备选方案）
        return calculatePriceFromMarketData(request);
    }

    /**
     * 从真实票务平台获取票价（需要API密钥配置）
     * 
     * 示例：猫眼API、淘票票API等
     * 需要：
     * 1. 与票务平台签订合作协议
     * 2. 获取API密钥和访问权限
     * 3. 实现具体的API调用逻辑
     * 
     * TODO: 当配置了真实票务API密钥后，在calculatePrice方法中启用此功能
     */
    @SuppressWarnings("unused")
    private TicketPriceResponse fetchFromRealTicketPlatform(TicketPriceRequest request) {
        // TODO: 实现真实票务API调用
        // 示例代码框架：
        /*
        try {
            // 1. 调用猫眼/淘票票API
            // String apiUrl = "https://api.maoyan.com/ticket/price";
            // Map<String, String> params = buildApiParams(request);
            // String response = httpClient.get(apiUrl, params);
            
            // 2. 解析响应数据
            // Integer price = parsePriceFromResponse(response);
            
            // 3. 返回真实票价
            // return new TicketPriceResponse(price, price, "maoyan", true);
        } catch (Exception e) {
            log.warn("无法从真实票务平台获取票价: {}", e.getMessage());
            return null;
        }
        */
        return null;
    }

    /**
     * 基于真实市场数据的票价计算
     * 
     * 根据2024年中国电影市场真实票价数据：
     * - 普通2D场次：35-60元
     * - IMAX/巨幕：55-85元
     * - 4DX：50-80元
     * - 杜比全景声：45-75元
     * - VIP厅：65-120元
     * 
     * 时间段折扣：
     * - 上午场（9:00-12:00）：75折（早场优惠）
     * - 下午场（12:00-18:00）：标准价
     * - 晚上场（18:00-22:00）：115%价格（黄金时段）
     * - 深夜场（22:00以后）：90%价格（深夜优惠）
     */
    private TicketPriceResponse calculatePriceFromMarketData(TicketPriceRequest request) {
        // 1. 根据影院品牌确定基础价格范围（基于真实市场数据）
        Map<String, int[]> brandPriceRange = new HashMap<>();
        brandPriceRange.put("IMAX", new int[]{55, 85});      // IMAX: 55-85元
        brandPriceRange.put("4DX", new int[]{50, 80});       // 4DX: 50-80元
        brandPriceRange.put("杜比", new int[]{45, 75});       // 杜比: 45-75元
        brandPriceRange.put("巨幕", new int[]{42, 68});       // 巨幕: 42-68元
        brandPriceRange.put("VIP", new int[]{65, 120});      // VIP: 65-120元
        brandPriceRange.put("default", new int[]{35, 60});   // 普通: 35-60元

        String brand = request.getBrand() != null ? request.getBrand() : "default";
        int[] range = brandPriceRange.getOrDefault(brand, brandPriceRange.get("default"));
        
        // 根据影院ID和名称生成稳定的基础价格（确保同一影院价格一致）
        int basePrice = range[0] + (Math.abs((request.getCinemaId() + request.getCinemaName()).hashCode()) % (range[1] - range[0] + 1));

        // 2. 根据电影评分调整价格（高分电影稍贵）
        double ratingMultiplier = 1.0;
        if (request.getRating() != null && request.getRating() > 0) {
            if (request.getRating() >= 9.0) {
                ratingMultiplier = 1.10;  // 高分热门电影
            } else if (request.getRating() >= 8.0) {
                ratingMultiplier = 1.05;  // 中等偏上
            } else if (request.getRating() >= 7.0) {
                ratingMultiplier = 1.0;   // 普通评分
            } else if (request.getRating() >= 6.0) {
                ratingMultiplier = 0.95;  // 较低评分
            } else {
                ratingMultiplier = 0.90;  // 低分电影
            }
        }

        // 3. 根据时间段计算折扣（基于真实市场定价策略）
        double timeMultiplier = 1.0;
        if (request.getTimeSlot() != null && !request.getTimeSlot().isEmpty()) {
            String[] timeParts = request.getTimeSlot().split(":");
            if (timeParts.length >= 1) {
                int hour = Integer.parseInt(timeParts[0]);
                if (hour >= 9 && hour < 12) {
                    timeMultiplier = 0.75;  // 上午场：75折
                } else if (hour >= 12 && hour < 18) {
                    timeMultiplier = 1.0;   // 下午场：标准价
                } else if (hour >= 18 && hour < 22) {
                    timeMultiplier = 1.15;  // 晚上场：115%价格
                } else {
                    timeMultiplier = 0.9;   // 深夜场：90%价格
                }
            }
        }

        // 4. 根据电影ID生成小幅价格波动（±3元，模拟不同电影的定价差异）
        int filmAdjustment = (Math.abs(request.getFilmId().hashCode()) % 7) - 3;  // -3到+3

        // 5. 计算最终价格
        int finalPrice = (int) Math.round(basePrice * ratingMultiplier * timeMultiplier + filmAdjustment);

        // 6. 确保价格在合理范围内
        int minPrice = 28;  // 普通场最低价
        int maxPrice = 150; // VIP场最高价
        
        if (brand.equals("VIP")) {
            minPrice = 50;
            maxPrice = 150;
        } else if (brand.equals("IMAX") || brand.equals("4DX")) {
            minPrice = 35;
            maxPrice = 120;
        } else if (brand.equals("杜比") || brand.equals("巨幕")) {
            minPrice = 32;
            maxPrice = 100;
        }

        if (finalPrice < minPrice) finalPrice = minPrice;
        if (finalPrice > maxPrice) finalPrice = maxPrice;

        // 7. 计算最低票价（用于影院列表显示）
        int minTicketPrice = (int) Math.round(basePrice * 0.75);  // 最低价为上午场价格
        if (minTicketPrice < minPrice) minTicketPrice = minPrice;

        log.info("计算完成: 最终票价={}元, 最低票价={}元", finalPrice, minTicketPrice);

        return new TicketPriceResponse(finalPrice, minTicketPrice, "market_data", false);
    }

    /**
     * 获取影院最低票价（用于影院列表显示）
     */
    public TicketPriceResponse getCinemaMinPrice(String cinemaId, String cinemaName, String brand) {
        TicketPriceRequest request = new TicketPriceRequest();
        request.setCinemaId(cinemaId);
        request.setCinemaName(cinemaName);
        request.setBrand(brand);
        request.setFilmId("default");
        request.setTimeSlot("09:00");  // 使用上午场价格作为最低价
        
        TicketPriceResponse response = calculatePrice(request);
        // 只返回最低价
        return new TicketPriceResponse(null, response.getMinPrice(), response.getSource(), response.getIsRealTime());
    }
}

