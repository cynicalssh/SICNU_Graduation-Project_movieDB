package com.movie.dto;

import java.util.List;

/**
 * 用户数据请求DTO
 */
public class UserDataRequest {
    private String dataType;  // filmFavorite, personFavorite, filmHistory, personHistory, filmWish, filmWatched
    private List<Object> data;  // 数据列表

    public String getDataType() {
        return dataType;
    }

    public void setDataType(String dataType) {
        this.dataType = dataType;
    }

    public List<Object> getData() {
        return data;
    }

    public void setData(List<Object> data) {
        this.data = data;
    }
}

















