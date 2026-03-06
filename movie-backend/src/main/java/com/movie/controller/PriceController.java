package com.movie.controller;

import com.movie.dto.TicketPriceRequest;
import com.movie.dto.TicketPriceResponse;
import com.movie.service.PriceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 票价控制器
 * 提供电影票价查询API
 */
@RestController
@RequestMapping("/price")
public class PriceController {

    private static final Logger log = LoggerFactory.getLogger(PriceController.class);

    @Autowired
    private PriceService priceService;

    /**
     * 计算票价
     * 
     * 请求示例：
     * POST /price/calculate
     * {
     *   "cinemaId": "cinema_001",
     *   "cinemaName": "万达影城",
     *   "brand": "IMAX",
     *   "filmId": "film_123",
     *   "filmTitle": "流浪地球2",
     *   "rating": 8.5,
     *   "timeSlot": "18:30",
     *   "city": "北京",
     *   "date": "2024-01-15"
     * }
     * 
     * 响应示例：
     * {
     *   "price": 68,
     *   "minPrice": 42,
     *   "source": "market_data",
     *   "isRealTime": false
     * }
     */
    @PostMapping("/calculate")
    public TicketPriceResponse calculatePrice(@RequestBody TicketPriceRequest request) {
        log.info("收到票价查询请求: cinemaId={}, filmId={}, timeSlot={}", 
                request.getCinemaId(), request.getFilmId(), request.getTimeSlot());
        
        try {
            TicketPriceResponse response = priceService.calculatePrice(request);
            log.info("票价计算完成: price={}, minPrice={}, source={}", 
                    response.getPrice(), response.getMinPrice(), response.getSource());
            return response;
        } catch (Exception e) {
            log.error("计算票价失败", e);
            // 返回默认价格作为兜底
            TicketPriceResponse defaultResponse = new TicketPriceResponse();
            defaultResponse.setPrice(45);
            defaultResponse.setMinPrice(35);
            defaultResponse.setSource("error_fallback");
            defaultResponse.setIsRealTime(false);
            return defaultResponse;
        }
    }

    /**
     * 获取影院最低票价（用于影院列表显示）
     * 
     * GET /price/min?cinemaId=xxx&cinemaName=xxx&brand=IMAX
     */
    @GetMapping("/min")
    public TicketPriceResponse getCinemaMinPrice(
            @RequestParam String cinemaId,
            @RequestParam(required = false) String cinemaName,
            @RequestParam(required = false) String brand) {
        log.info("查询影院最低票价: cinemaId={}, cinemaName={}, brand={}", 
                cinemaId, cinemaName, brand);
        
        try {
            return priceService.getCinemaMinPrice(
                    cinemaId, 
                    cinemaName != null ? cinemaName : "", 
                    brand != null ? brand : "default");
        } catch (Exception e) {
            log.error("获取最低票价失败", e);
            TicketPriceResponse defaultResponse = new TicketPriceResponse();
            defaultResponse.setMinPrice(35);
            defaultResponse.setSource("error_fallback");
            defaultResponse.setIsRealTime(false);
            return defaultResponse;
        }
    }
}



















