package com.movie.entity;

import java.util.ArrayList;
import java.util.List;

/**
 * 用户数据实体（存储收藏、浏览记录、想看、看过等）
 */
public class UserData {
    private Long userId;
    private List<Object> filmFavorite;      // 电影收藏
    private List<Object> personFavorite;     // 人物收藏
    private List<Object> filmHistory;        // 电影浏览记录
    private List<Object> personHistory;      // 人物浏览记录
    private List<Object> filmWish;           // 想看
    private List<Object> filmWatched;       // 看过
    private Long updateTime;                  // 更新时间

    public UserData() {
        this.filmFavorite = new ArrayList<>();
        this.personFavorite = new ArrayList<>();
        this.filmHistory = new ArrayList<>();
        this.personHistory = new ArrayList<>();
        this.filmWish = new ArrayList<>();
        this.filmWatched = new ArrayList<>();
        this.updateTime = System.currentTimeMillis();
    }

    public UserData(Long userId) {
        this();
        this.userId = userId;
    }

    // Getters and Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public List<Object> getFilmFavorite() {
        return filmFavorite;
    }

    public void setFilmFavorite(List<Object> filmFavorite) {
        this.filmFavorite = filmFavorite != null ? filmFavorite : new ArrayList<>();
    }

    public List<Object> getPersonFavorite() {
        return personFavorite;
    }

    public void setPersonFavorite(List<Object> personFavorite) {
        this.personFavorite = personFavorite != null ? personFavorite : new ArrayList<>();
    }

    public List<Object> getFilmHistory() {
        return filmHistory;
    }

    public void setFilmHistory(List<Object> filmHistory) {
        this.filmHistory = filmHistory != null ? filmHistory : new ArrayList<>();
    }

    public List<Object> getPersonHistory() {
        return personHistory;
    }

    public void setPersonHistory(List<Object> personHistory) {
        this.personHistory = personHistory != null ? personHistory : new ArrayList<>();
    }

    public List<Object> getFilmWish() {
        return filmWish;
    }

    public void setFilmWish(List<Object> filmWish) {
        this.filmWish = filmWish != null ? filmWish : new ArrayList<>();
    }

    public List<Object> getFilmWatched() {
        return filmWatched;
    }

    public void setFilmWatched(List<Object> filmWatched) {
        this.filmWatched = filmWatched != null ? filmWatched : new ArrayList<>();
    }

    public Long getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(Long updateTime) {
        this.updateTime = updateTime;
    }
}

















