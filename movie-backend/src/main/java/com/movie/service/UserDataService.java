package com.movie.service;

import com.alibaba.fastjson.JSON;
import com.movie.entity.UserData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 用户数据服务（MySQL持久化）
 * 管理用户的收藏、浏览记录、想看、看过等数据
 */
@Service
public class UserDataService {

    private static final Logger log = LoggerFactory.getLogger(UserDataService.class);

    private final JdbcTemplate jdbcTemplate;

    public UserDataService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 获取用户数据（如果不存在则创建）
     */
    public UserData getOrCreateUserData(Long userId) {
        UserData existing = getUserDataIfExists(userId);
        if (existing != null) {
            return existing;
        }

        long now = System.currentTimeMillis();
        try {
            jdbcTemplate.update(
                    "INSERT INTO user_data (user_id, film_favorite_json, person_favorite_json, film_history_json, person_history_json, film_wish_json, film_watched_json, update_time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    userId, "[]", "[]", "[]", "[]", "[]", "[]", now
            );
        } catch (DataAccessException e) {
            // 并发创建场景回查兜底
            UserData fallback = getUserDataIfExists(userId);
            if (fallback != null) {
                return fallback;
            }
            throw e;
        }
        log.info("创建新用户数据: userId={}", userId);

        UserData created = new UserData(userId);
        created.setUpdateTime(now);
        return created;
    }

    /**
     * 保存用户数据
     */
    public UserData saveUserData(Long userId, UserData userData) {
        userData.setUserId(userId);
        userData.setUpdateTime(System.currentTimeMillis());
        int updated = jdbcTemplate.update(
                "UPDATE user_data SET film_favorite_json=?, person_favorite_json=?, film_history_json=?, person_history_json=?, film_wish_json=?, film_watched_json=?, update_time=? WHERE user_id=?",
                toJson(userData.getFilmFavorite()),
                toJson(userData.getPersonFavorite()),
                toJson(userData.getFilmHistory()),
                toJson(userData.getPersonHistory()),
                toJson(userData.getFilmWish()),
                toJson(userData.getFilmWatched()),
                userData.getUpdateTime(),
                userId
        );

        if (updated == 0) {
            jdbcTemplate.update(
                    "INSERT INTO user_data (user_id, film_favorite_json, person_favorite_json, film_history_json, person_history_json, film_wish_json, film_watched_json, update_time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    userId,
                    toJson(userData.getFilmFavorite()),
                    toJson(userData.getPersonFavorite()),
                    toJson(userData.getFilmHistory()),
                    toJson(userData.getPersonHistory()),
                    toJson(userData.getFilmWish()),
                    toJson(userData.getFilmWatched()),
                    userData.getUpdateTime()
            );
        }
        log.info("保存用户数据: userId={}", userId);
        return userData;
    }

    /**
     * 更新用户数据（部分更新）
     */
    public UserData updateUserData(Long userId, String dataType, List<Object> data) {
        UserData userData = getOrCreateUserData(userId);

        switch (dataType) {
            case "filmFavorite":
                userData.setFilmFavorite(data);
                break;
            case "personFavorite":
                userData.setPersonFavorite(data);
                break;
            case "filmHistory":
                userData.setFilmHistory(data);
                break;
            case "personHistory":
                userData.setPersonHistory(data);
                break;
            case "filmWish":
                userData.setFilmWish(data);
                break;
            case "filmWatched":
                userData.setFilmWatched(data);
                break;
            default:
                log.warn("未知的数据类型: {}", dataType);
                return userData;
        }

        userData.setUpdateTime(System.currentTimeMillis());
        saveUserData(userId, userData);
        log.info("更新用户数据: userId={}, dataType={}, size={}", userId, dataType, data != null ? data.size() : 0);
        return userData;
    }

    /**
     * 获取用户数据
     */
    public UserData getUserData(Long userId) {
        return getOrCreateUserData(userId);
    }

    /**
     * 删除用户数据
     */
    public void deleteUserData(Long userId) {
        jdbcTemplate.update("DELETE FROM user_data WHERE user_id=?", userId);
        log.info("删除用户数据: userId={}", userId);
    }

    private UserData getUserDataIfExists(Long userId) {
        List<UserData> result = jdbcTemplate.query(
                "SELECT user_id, film_favorite_json, person_favorite_json, film_history_json, person_history_json, film_wish_json, film_watched_json, update_time FROM user_data WHERE user_id=? LIMIT 1",
                (rs, rowNum) -> {
                    UserData userData = new UserData();
                    userData.setUserId(rs.getLong("user_id"));
                    userData.setFilmFavorite(fromJson(rs.getString("film_favorite_json")));
                    userData.setPersonFavorite(fromJson(rs.getString("person_favorite_json")));
                    userData.setFilmHistory(fromJson(rs.getString("film_history_json")));
                    userData.setPersonHistory(fromJson(rs.getString("person_history_json")));
                    userData.setFilmWish(fromJson(rs.getString("film_wish_json")));
                    userData.setFilmWatched(fromJson(rs.getString("film_watched_json")));
                    userData.setUpdateTime(rs.getLong("update_time"));
                    return userData;
                },
                userId
        );
        return result.isEmpty() ? null : result.get(0);
    }

    private String toJson(List<Object> data) {
        List<Object> safeList = data != null ? data : new ArrayList<Object>();
        return JSON.toJSONString(safeList);
    }

    private List<Object> fromJson(String json) {
        if (json == null || json.trim().isEmpty()) {
            return new ArrayList<Object>();
        }
        try {
            List<Object> parsed = JSON.parseArray(json, Object.class);
            return parsed != null ? new ArrayList<Object>(parsed) : new ArrayList<Object>();
        } catch (Exception e) {
            log.warn("解析用户数据JSON失败，返回空列表: {}", e.getMessage());
            return new ArrayList<Object>();
        }
    }
}
