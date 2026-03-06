package com.movie.controller;

import com.movie.dto.UserDataResponse;
import com.movie.entity.User;
import com.movie.entity.UserData;
import com.movie.service.UserDataService;
import com.movie.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户数据控制器
 * 提供用户数据（收藏、浏览记录、想看、看过）的保存和获取接口
 */
@RestController
@RequestMapping("/user/data")
public class UserDataController {

    private static final Logger log = LoggerFactory.getLogger(UserDataController.class);

    @Autowired
    private UserDataService userDataService;

    @Autowired
    private UserService userService;

    /**
     * 获取用户所有数据
     * GET /user/data?token=xxx
     */
    @GetMapping("")
    public Map<String, Object> getUserData(@RequestParam String token) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 验证token并获取用户
            User user = userService.getUserByToken(token);
            if (user == null) {
                response.put("success", false);
                response.put("message", "无效的token");
                return response;
            }

            // 获取用户数据
            UserData userData = userDataService.getUserData(user.getId());
            
            UserDataResponse dataResponse = new UserDataResponse();
            dataResponse.setFilmFavorite(userData.getFilmFavorite());
            dataResponse.setPersonFavorite(userData.getPersonFavorite());
            dataResponse.setFilmHistory(userData.getFilmHistory());
            dataResponse.setPersonHistory(userData.getPersonHistory());
            dataResponse.setFilmWish(userData.getFilmWish());
            dataResponse.setFilmWatched(userData.getFilmWatched());
            dataResponse.setUpdateTime(userData.getUpdateTime());

            response.put("success", true);
            response.put("data", dataResponse);
            log.info("获取用户数据成功: userId={}", user.getId());
        } catch (Exception e) {
            log.error("获取用户数据失败", e);
            response.put("success", false);
            response.put("message", "获取数据失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 保存用户数据（部分更新）
     * POST /user/data/save
     * Body: { "token": "xxx", "dataType": "filmFavorite", "data": [...] }
     */
    @PostMapping("/save")
    public Map<String, Object> saveUserData(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String token = (String) request.get("token");
            String dataType = (String) request.get("dataType");
            List<Object> data = extractList(request.get("data"));

            if (token == null || dataType == null) {
                log.warn("保存用户数据参数不完整: tokenEmpty={}, dataType={}", token == null || token.trim().isEmpty(), dataType);
                response.put("success", false);
                response.put("message", "参数不完整");
                return response;
            }

            // 验证token并获取用户
            User user = userService.getUserByToken(token);
            if (user == null) {
                log.warn("保存用户数据失败: 无效token, dataType={}", dataType);
                response.put("success", false);
                response.put("message", "无效的token");
                return response;
            }

            // 保存数据
            userDataService.updateUserData(user.getId(), dataType, data != null ? data : new ArrayList<>());

            response.put("success", true);
            response.put("message", "保存成功");
            log.info("保存用户数据成功: userId={}, dataType={}", user.getId(), dataType);
        } catch (Exception e) {
            log.error("保存用户数据失败", e);
            response.put("success", false);
            response.put("message", "保存失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 同步用户所有数据
     * POST /user/data/sync
     * Body: { "token": "xxx", "filmFavorite": [...], "personFavorite": [...], ... }
     */
    @PostMapping("/sync")
    public Map<String, Object> syncUserData(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String token = (String) request.get("token");
            if (token == null) {
                log.warn("同步用户数据失败: token为空");
                response.put("success", false);
                response.put("message", "token不能为空");
                return response;
            }

            // 验证token并获取用户
            User user = userService.getUserByToken(token);
            if (user == null) {
                log.warn("同步用户数据失败: 无效token");
                response.put("success", false);
                response.put("message", "无效的token");
                return response;
            }

            // 获取或创建用户数据
            UserData userData = userDataService.getOrCreateUserData(user.getId());

            // 更新各项数据（如果提供了的话）
            if (request.containsKey("filmFavorite")) {
                userData.setFilmFavorite(extractList(request.get("filmFavorite")));
            }
            if (request.containsKey("personFavorite")) {
                userData.setPersonFavorite(extractList(request.get("personFavorite")));
            }
            if (request.containsKey("filmHistory")) {
                userData.setFilmHistory(extractList(request.get("filmHistory")));
            }
            if (request.containsKey("personHistory")) {
                userData.setPersonHistory(extractList(request.get("personHistory")));
            }
            if (request.containsKey("filmWish")) {
                userData.setFilmWish(extractList(request.get("filmWish")));
            }
            if (request.containsKey("filmWatched")) {
                userData.setFilmWatched(extractList(request.get("filmWatched")));
            }

            userData.setUpdateTime(System.currentTimeMillis());
            userDataService.saveUserData(user.getId(), userData);

            response.put("success", true);
            response.put("message", "同步成功");
            log.info("同步用户数据成功: userId={}", user.getId());
        } catch (Exception e) {
            log.error("同步用户数据失败", e);
            response.put("success", false);
            response.put("message", "同步失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 从 Map 取值中安全提取 List（JSON 反序列化后数组会变成 List）
     */
    private List<Object> extractList(Object obj) {
        if (obj == null) return new ArrayList<>();
        if (obj instanceof List) return new ArrayList<>((List<?>) obj);
        return new ArrayList<>();
    }
}















