package com.movie.service;

import com.movie.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;

/**
 * 用户服务（MySQL持久化）
 */
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<User> userRowMapper = (rs, rowNum) -> {
        User user = new User();
        user.setId(rs.getLong("id"));
        user.setOpenId(rs.getString("open_id"));
        user.setToken(rs.getString("token"));
        user.setCreateTime(rs.getLong("create_time"));
        return user;
    };

    public UserService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 根据openId获取或创建用户
     */
    public User getOrCreateUser(String openId) {
        User existingUser = findByOpenId(openId);
        long now = System.currentTimeMillis();

        if (existingUser != null) {
            // 每次登录刷新token，便于会话管理
            String newToken = generateToken();
            jdbcTemplate.update(
                    "UPDATE movie_user SET token=?, update_time=?, last_login_time=? WHERE id=?",
                    newToken, now, now, existingUser.getId()
            );
            existingUser.setToken(newToken);
            log.info("用户已存在并刷新token: openId={}, userId={}", openId, existingUser.getId());
            return existingUser;
        }

        User user = new User();
        user.setOpenId(openId);
        user.setToken(generateToken());
        user.setCreateTime(now);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        try {
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                        "INSERT INTO movie_user (open_id, token, create_time, update_time, last_login_time) VALUES (?, ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, user.getOpenId());
                ps.setString(2, user.getToken());
                ps.setLong(3, now);
                ps.setLong(4, now);
                ps.setLong(5, now);
                return ps;
            }, keyHolder);
        } catch (DataAccessException e) {
            // 并发情况下可能被其他请求先插入，回查并返回
            log.warn("创建用户插入失败，尝试回查用户: openId={}", openId, e);
            User fallback = findByOpenId(openId);
            if (fallback != null) {
                return fallback;
            }
            throw e;
        }

        Number key = keyHolder.getKey();
        if (key != null) {
            user.setId(key.longValue());
        } else {
            // 理论上不会走到，作为兜底查询
            User fallback = findByOpenId(openId);
            if (fallback != null) {
                return fallback;
            }
        }

        log.info("创建新用户: openId={}, userId={}, token={}", openId, user.getId(), user.getToken());
        return user;
    }

    /**
     * 生成UUID token
     */
    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 根据token获取用户
     */
    @SuppressWarnings("null")
    public User getUserByToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        List<User> users = jdbcTemplate.query(
                "SELECT id, open_id, token, create_time FROM movie_user WHERE token = ? LIMIT 1",
                userRowMapper,
                token
        );
        return users.isEmpty() ? null : users.get(0);
    }

    @SuppressWarnings("null")
    private User findByOpenId(String openId) {
        if (openId == null || openId.trim().isEmpty()) {
            return null;
        }
        try {
            List<User> users = jdbcTemplate.query(
                    "SELECT id, open_id, token, create_time FROM movie_user WHERE open_id = ? LIMIT 1",
                    userRowMapper,
                    openId
            );
            return users.isEmpty() ? null : users.get(0);
        } catch (DataAccessException e) {
            log.error("查询用户失败: openId={}", openId, e);
            return null;
        }
    }
}
