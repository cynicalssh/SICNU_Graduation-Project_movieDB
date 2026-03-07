package com.movie.service;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 电影知识图谱服务（MVP）
 * 使用 TMDB 实时数据构建电影关系：导演 / 演员 / 类型 / 系列电影。
 */
@Service
public class GraphService {

    private static final Logger log = LoggerFactory.getLogger(GraphService.class);
    private static final String TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

    @Value("${tmdb.api-key:ea9d76ccb9ae9639d229cfda8cda1bec}")
    private String tmdbApiKey;

    @Value("${tmdb.base-url:https://api.themoviedb.org/3}")
    private String tmdbBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> getFilmGraph(Long movieId) {
        JSONObject movieDetail = requestTmdb("/movie/" + movieId, mapOf(
                "append_to_response", "credits",
                "region", "CN"
        ));

        Map<String, Object> movie = toMovieBrief(movieDetail);
        movie.put("overview", safeStr(movieDetail.getString("overview")));

        Map<String, Object> relations = new LinkedHashMap<String, Object>();
        relations.put("directors", buildDirectors(movieDetail));
        relations.put("actors", buildActors(movieDetail));
        relations.put("genres", buildGenres(movieDetail));
        relations.put("series", buildSeries(movieDetail));

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("movie", movie);
        data.put("relations", relations);
        data.put("sample", buildSampleNolanRelation());
        return data;
    }

    public Map<String, Object> getPersonFilms(Long personId, String role, Integer limit) {
        String normalizedRole = role == null ? "actor" : role.toLowerCase(Locale.ROOT);
        int max = (limit == null || limit <= 0) ? 40 : Math.min(limit, 100);

        JSONObject person = requestTmdb("/person/" + personId, mapOf());
        JSONObject credits = requestTmdb("/person/" + personId + "/movie_credits", mapOf());
        JSONArray cast = credits == null ? new JSONArray() : credits.getJSONArray("cast");
        JSONArray crew = credits == null ? new JSONArray() : credits.getJSONArray("crew");

        Map<Long, Map<String, Object>> dedup = new LinkedHashMap<Long, Map<String, Object>>();
        if ("director".equals(normalizedRole)) {
            addDirectorWorks(dedup, crew);
        } else if ("actor".equals(normalizedRole)) {
            addActorWorks(dedup, cast);
        } else {
            addDirectorWorks(dedup, crew);
            addActorWorks(dedup, cast);
        }

        List<Map<String, Object>> films = new ArrayList<Map<String, Object>>(dedup.values());
        films.sort(new Comparator<Map<String, Object>>() {
            @Override
            public int compare(Map<String, Object> a, Map<String, Object> b) {
                Double pa = toDouble(a.get("popularity"));
                Double pb = toDouble(b.get("popularity"));
                return pb.compareTo(pa);
            }
        });
        if (films.size() > max) {
            films = new ArrayList<Map<String, Object>>(films.subList(0, max));
        }

        Map<String, Object> node = new LinkedHashMap<String, Object>();
        node.put("id", personId);
        node.put("name", person == null ? "" : safeStr(person.getString("name")));
        node.put("type", "person");
        node.put("role", normalizedRole);

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("node", node);
        data.put("films", films);
        return data;
    }

    public Map<String, Object> getGenreFilms(Long genreId, Integer page, Integer limit) {
        int currentPage = (page == null || page <= 0) ? 1 : page;
        int max = (limit == null || limit <= 0) ? 40 : Math.min(limit, 100);

        JSONObject discover = requestTmdb("/discover/movie", mapOf(
                "with_genres", String.valueOf(genreId),
                "sort_by", "popularity.desc",
                "include_adult", "false",
                "include_video", "false",
                "page", String.valueOf(currentPage),
                "region", "CN"
        ));

        JSONArray results = discover == null ? new JSONArray() : discover.getJSONArray("results");
        List<Map<String, Object>> films = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < results.size() && films.size() < max; i++) {
            films.add(toMovieBrief(results.getJSONObject(i)));
        }

        Map<String, Object> node = new LinkedHashMap<String, Object>();
        node.put("id", genreId);
        node.put("name", resolveGenreName(genreId));
        node.put("type", "genre");

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("node", node);
        data.put("films", films);
        data.put("page", currentPage);
        data.put("totalPages", discover == null ? 1 : discover.getIntValue("total_pages"));
        return data;
    }

    public Map<String, Object> getSeriesFilms(Long collectionId) {
        JSONObject collection = requestTmdb("/collection/" + collectionId, mapOf());
        JSONArray parts = collection == null ? new JSONArray() : collection.getJSONArray("parts");

        List<Map<String, Object>> films = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < parts.size(); i++) {
            films.add(toMovieBrief(parts.getJSONObject(i)));
        }
        films.sort(new Comparator<Map<String, Object>>() {
            @Override
            public int compare(Map<String, Object> a, Map<String, Object> b) {
                String da = safeStr((String) a.get("releaseDate"));
                String db = safeStr((String) b.get("releaseDate"));
                return da.compareTo(db);
            }
        });

        Map<String, Object> node = new LinkedHashMap<String, Object>();
        node.put("id", collectionId);
        node.put("name", collection == null ? "" : safeStr(collection.getString("name")));
        node.put("type", "series");

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("node", node);
        data.put("films", films);
        return data;
    }

    private List<Map<String, Object>> buildDirectors(JSONObject movieDetail) {
        List<Map<String, Object>> directors = new ArrayList<Map<String, Object>>();
        Map<Long, Boolean> exists = new HashMap<Long, Boolean>();

        JSONObject credits = movieDetail == null ? null : movieDetail.getJSONObject("credits");
        JSONArray crew = credits == null ? new JSONArray() : credits.getJSONArray("crew");
        for (int i = 0; i < crew.size(); i++) {
            JSONObject c = crew.getJSONObject(i);
            if (!"Director".equalsIgnoreCase(safeStr(c.getString("job")))) {
                continue;
            }
            Long id = c.getLong("id");
            if (id == null || exists.containsKey(id)) {
                continue;
            }
            exists.put(id, true);
            Map<String, Object> node = new LinkedHashMap<String, Object>();
            node.put("id", id);
            node.put("name", safeStr(c.getString("name")));
            node.put("type", "director");
            node.put("role", "导演");
            directors.add(node);
        }
        return directors;
    }

    private List<Map<String, Object>> buildActors(JSONObject movieDetail) {
        List<Map<String, Object>> actors = new ArrayList<Map<String, Object>>();
        JSONObject credits = movieDetail == null ? null : movieDetail.getJSONObject("credits");
        JSONArray cast = credits == null ? new JSONArray() : credits.getJSONArray("cast");
        int max = Math.min(cast.size(), 12);
        for (int i = 0; i < max; i++) {
            JSONObject c = cast.getJSONObject(i);
            Long id = c.getLong("id");
            if (id == null) {
                continue;
            }
            Map<String, Object> node = new LinkedHashMap<String, Object>();
            node.put("id", id);
            node.put("name", safeStr(c.getString("name")));
            node.put("type", "actor");
            node.put("role", "演员");
            node.put("character", safeStr(c.getString("character")));
            actors.add(node);
        }
        return actors;
    }

    private List<Map<String, Object>> buildGenres(JSONObject movieDetail) {
        List<Map<String, Object>> genres = new ArrayList<Map<String, Object>>();
        JSONArray genreArray = movieDetail == null ? new JSONArray() : movieDetail.getJSONArray("genres");
        for (int i = 0; i < genreArray.size(); i++) {
            JSONObject g = genreArray.getJSONObject(i);
            Map<String, Object> node = new LinkedHashMap<String, Object>();
            node.put("id", g.getLong("id"));
            node.put("name", safeStr(g.getString("name")));
            node.put("type", "genre");
            node.put("role", "类型");
            genres.add(node);
        }
        return genres;
    }

    private List<Map<String, Object>> buildSeries(JSONObject movieDetail) {
        List<Map<String, Object>> series = new ArrayList<Map<String, Object>>();
        JSONObject collection = movieDetail == null ? null : movieDetail.getJSONObject("belongs_to_collection");
        if (collection == null || collection.isEmpty()) {
            return series;
        }
        Long collectionId = collection.getLong("id");
        if (collectionId == null) {
            return series;
        }

        Map<String, Object> node = new LinkedHashMap<String, Object>();
        node.put("id", collectionId);
        node.put("name", safeStr(collection.getString("name")));
        node.put("type", "series");
        node.put("role", "系列电影");

        try {
            JSONObject collectionData = requestTmdb("/collection/" + collectionId, mapOf());
            JSONArray parts = collectionData == null ? new JSONArray() : collectionData.getJSONArray("parts");
            node.put("movieCount", parts.size());
        } catch (Exception e) {
            log.warn("获取系列电影数量失败: collectionId={}, err={}", collectionId, e.getMessage());
            node.put("movieCount", 0);
        }
        series.add(node);
        return series;
    }

    private void addDirectorWorks(Map<Long, Map<String, Object>> dedup, JSONArray crew) {
        if (crew == null) {
            return;
        }
        for (int i = 0; i < crew.size(); i++) {
            JSONObject item = crew.getJSONObject(i);
            if (!"Director".equalsIgnoreCase(safeStr(item.getString("job")))) {
                continue;
            }
            Long id = item.getLong("id");
            if (id == null || dedup.containsKey(id)) {
                continue;
            }
            Map<String, Object> film = toMovieBrief(item);
            film.put("personRole", "director");
            dedup.put(id, film);
        }
    }

    private void addActorWorks(Map<Long, Map<String, Object>> dedup, JSONArray cast) {
        if (cast == null) {
            return;
        }
        for (int i = 0; i < cast.size(); i++) {
            JSONObject item = cast.getJSONObject(i);
            Long id = item.getLong("id");
            if (id == null || dedup.containsKey(id)) {
                continue;
            }
            Map<String, Object> film = toMovieBrief(item);
            film.put("personRole", "actor");
            dedup.put(id, film);
        }
    }

    private String resolveGenreName(Long genreId) {
        try {
            JSONObject genres = requestTmdb("/genre/movie/list", mapOf());
            JSONArray arr = genres == null ? new JSONArray() : genres.getJSONArray("genres");
            for (int i = 0; i < arr.size(); i++) {
                JSONObject g = arr.getJSONObject(i);
                if (genreId != null && genreId.equals(g.getLong("id"))) {
                    return safeStr(g.getString("name"));
                }
            }
        } catch (Exception e) {
            log.warn("解析类型名称失败: genreId={}, err={}", genreId, e.getMessage());
        }
        return "未知类型";
    }

    private Map<String, Object> toMovieBrief(JSONObject filmJson) {
        Map<String, Object> film = new LinkedHashMap<String, Object>();
        if (filmJson == null) {
            return film;
        }

        Long id = filmJson.getLong("id");
        String title = safeStr(filmJson.getString("title"));
        if (title.isEmpty()) {
            title = safeStr(filmJson.getString("name"));
        }
        String releaseDate = safeStr(filmJson.getString("release_date"));
        String year = releaseDate.length() >= 4 ? releaseDate.substring(0, 4) : safeStr(filmJson.getString("first_air_date"));
        if (year.length() >= 4) {
            year = year.substring(0, 4);
        } else if (year.isEmpty()) {
            year = safeStr(filmJson.getString("year"));
        }

        film.put("id", id);
        film.put("title", title);
        film.put("originalTitle", safeStr(filmJson.getString("original_title")));
        film.put("overview", safeStr(filmJson.getString("overview")));
        film.put("releaseDate", releaseDate);
        film.put("year", year);
        film.put("voteAverage", filmJson.getDoubleValue("vote_average"));
        film.put("voteCount", filmJson.getIntValue("vote_count"));
        film.put("popularity", filmJson.getDoubleValue("popularity"));

        String posterPath = safeStr(filmJson.getString("poster_path"));
        String backdropPath = safeStr(filmJson.getString("backdrop_path"));
        film.put("posterUrl", posterPath.isEmpty() ? "" : (TMDB_IMAGE_BASE + "w500" + posterPath));
        film.put("backdropUrl", backdropPath.isEmpty() ? "" : (TMDB_IMAGE_BASE + "w780" + backdropPath));
        film.put("source", "tmdb");
        return film;
    }

    private Map<String, Object> buildSampleNolanRelation() {
        Map<String, Object> sample = new LinkedHashMap<String, Object>();
        sample.put("name", "诺兰");
        sample.put("relationType", "导演");

        List<Map<String, Object>> films = new ArrayList<Map<String, Object>>();
        films.add(sampleFilm(157336L, "星际穿越"));
        films.add(sampleFilm(27205L, "盗梦空间"));
        films.add(sampleFilm(872585L, "奥本海默"));
        sample.put("films", films);
        return sample;
    }

    private Map<String, Object> sampleFilm(Long id, String title) {
        Map<String, Object> film = new LinkedHashMap<String, Object>();
        film.put("id", id);
        film.put("title", title);
        return film;
    }

    private JSONObject requestTmdb(String path, Map<String, String> queryParams) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(tmdbBaseUrl + path)
                .queryParam("api_key", tmdbApiKey)
                .queryParam("language", "zh-CN");

        for (Map.Entry<String, String> entry : queryParams.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().trim().isEmpty()) {
                builder.queryParam(entry.getKey(), entry.getValue());
            }
        }

        String url = builder.build(true).toUriString();
        try {
            String response = restTemplate.getForObject(url, String.class);
            if (response == null || response.trim().isEmpty()) {
                throw new RuntimeException("TMDB返回空响应");
            }
            JSONObject json = JSON.parseObject(response);
            if (json != null && json.containsKey("status_code") && json.getIntValue("status_code") >= 300) {
                throw new RuntimeException("TMDB异常: " + json.getString("status_message"));
            }
            return json;
        } catch (Exception e) {
            log.error("请求TMDB失败: path={}, url={}, err={}", path, url, e.getMessage());
            throw new RuntimeException("请求TMDB失败: " + e.getMessage(), e);
        }
    }

    private Map<String, String> mapOf(String... kv) {
        Map<String, String> map = new LinkedHashMap<String, String>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            map.put(kv[i], kv[i + 1]);
        }
        return map;
    }

    private String safeStr(String val) {
        return val == null ? "" : val.trim();
    }

    private Double toDouble(Object val) {
        if (val instanceof Number) {
            return ((Number) val).doubleValue();
        }
        if (val == null) {
            return 0D;
        }
        try {
            return Double.parseDouble(String.valueOf(val));
        } catch (Exception e) {
            return 0D;
        }
    }
}
