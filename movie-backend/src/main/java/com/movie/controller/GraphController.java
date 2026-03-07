package com.movie.controller;

import com.movie.service.GraphService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 电影知识图谱控制器
 * 提供电影关系查询能力：导演 / 演员 / 类型 / 系列电影。
 */
@RestController
@RequestMapping("/graph")
public class GraphController {

    private static final Logger log = LoggerFactory.getLogger(GraphController.class);

    @Autowired
    private GraphService graphService;

    /**
     * 获取某部电影的关系图谱数据
     * GET /graph/relation?movieId=157336
     */
    @GetMapping("/relation")
    public Map<String, Object> getFilmRelation(@RequestParam Long movieId) {
        Map<String, Object> response = new HashMap<String, Object>();
        try {
            response.put("success", true);
            response.put("data", graphService.getFilmGraph(movieId));
        } catch (Exception e) {
            log.error("获取电影关系失败: movieId={}", movieId, e);
            response.put("success", false);
            response.put("message", "获取电影关系失败: " + e.getMessage());
        }
        return response;
    }

    /**
     * 获取人物（演员/导演）相关电影
     * GET /graph/person/{id}/films?role=actor|director&limit=40
     */
    @GetMapping("/person/{personId}/films")
    public Map<String, Object> getPersonFilms(
            @PathVariable Long personId,
            @RequestParam(defaultValue = "actor") String role,
            @RequestParam(required = false) Integer limit) {
        Map<String, Object> response = new HashMap<String, Object>();
        try {
            response.put("success", true);
            response.put("data", graphService.getPersonFilms(personId, role, limit));
        } catch (Exception e) {
            log.error("获取人物电影失败: personId={}, role={}", personId, role, e);
            response.put("success", false);
            response.put("message", "获取人物电影失败: " + e.getMessage());
        }
        return response;
    }

    /**
     * 获取类型相关电影
     * GET /graph/genre/{id}/films?page=1&limit=40
     */
    @GetMapping("/genre/{genreId}/films")
    public Map<String, Object> getGenreFilms(
            @PathVariable Long genreId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit) {
        Map<String, Object> response = new HashMap<String, Object>();
        try {
            response.put("success", true);
            response.put("data", graphService.getGenreFilms(genreId, page, limit));
        } catch (Exception e) {
            log.error("获取类型电影失败: genreId={}", genreId, e);
            response.put("success", false);
            response.put("message", "获取类型电影失败: " + e.getMessage());
        }
        return response;
    }

    /**
     * 获取系列电影列表
     * GET /graph/series/{id}/films
     */
    @GetMapping("/series/{seriesId}/films")
    public Map<String, Object> getSeriesFilms(@PathVariable Long seriesId) {
        Map<String, Object> response = new HashMap<String, Object>();
        try {
            response.put("success", true);
            response.put("data", graphService.getSeriesFilms(seriesId));
        } catch (Exception e) {
            log.error("获取系列电影失败: seriesId={}", seriesId, e);
            response.put("success", false);
            response.put("message", "获取系列电影失败: " + e.getMessage());
        }
        return response;
    }
}
