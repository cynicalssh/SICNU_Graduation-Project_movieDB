package com.movie.dto;

import java.util.List;

/**
 * 用户数据响应DTO
 */
public class UserDataResponse {
    private List<Object> filmFavorite;
    private List<Object> personFavorite;
    private List<Object> filmHistory;
    private List<Object> personHistory;
    private List<Object> filmWish;
    private List<Object> filmWatched;
    private Long updateTime;

    public UserDataResponse() {
    }

    // Getters and Setters
    public List<Object> getFilmFavorite() {
        return filmFavorite;
    }

    public void setFilmFavorite(List<Object> filmFavorite) {
        this.filmFavorite = filmFavorite;
    }

    public List<Object> getPersonFavorite() {
        return personFavorite;
    }

    public void setPersonFavorite(List<Object> personFavorite) {
        this.personFavorite = personFavorite;
    }

    public List<Object> getFilmHistory() {
        return filmHistory;
    }

    public void setFilmHistory(List<Object> filmHistory) {
        this.filmHistory = filmHistory;
    }

    public List<Object> getPersonHistory() {
        return personHistory;
    }

    public void setPersonHistory(List<Object> personHistory) {
        this.personHistory = personHistory;
    }

    public List<Object> getFilmWish() {
        return filmWish;
    }

    public void setFilmWish(List<Object> filmWish) {
        this.filmWish = filmWish;
    }

    public List<Object> getFilmWatched() {
        return filmWatched;
    }

    public void setFilmWatched(List<Object> filmWatched) {
        this.filmWatched = filmWatched;
    }

    public Long getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(Long updateTime) {
        this.updateTime = updateTime;
    }
}

















