package com.movie.dto;

/**
 * 票价查询响应DTO
 */
public class TicketPriceResponse {
    private Integer price;  // 票价（单位：元）
    private Integer minPrice;  // 最低票价（用于影院列表显示）
    private String source;  // 数据来源（如：maoyan, taopiaopiao, 或 market_data）
    private Boolean isRealTime;  // 是否为实时数据

    public TicketPriceResponse() {
    }

    public TicketPriceResponse(Integer price, Integer minPrice, String source, Boolean isRealTime) {
        this.price = price;
        this.minPrice = minPrice;
        this.source = source;
        this.isRealTime = isRealTime;
    }

    // Getters and Setters
    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public Integer getMinPrice() {
        return minPrice;
    }

    public void setMinPrice(Integer minPrice) {
        this.minPrice = minPrice;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Boolean getIsRealTime() {
        return isRealTime;
    }

    public void setIsRealTime(Boolean isRealTime) {
        this.isRealTime = isRealTime;
    }
}



















