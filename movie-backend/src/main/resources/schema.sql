CREATE TABLE IF NOT EXISTS movie_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    open_id VARCHAR(128) NOT NULL,
    token VARCHAR(128) NOT NULL,
    create_time BIGINT NOT NULL,
    update_time BIGINT NOT NULL,
    last_login_time BIGINT NOT NULL,
    UNIQUE KEY uk_movie_user_open_id (open_id),
    UNIQUE KEY uk_movie_user_token (token)
);

CREATE TABLE IF NOT EXISTS user_data (
    user_id BIGINT PRIMARY KEY,
    film_favorite_json LONGTEXT NOT NULL,
    person_favorite_json LONGTEXT NOT NULL,
    film_history_json LONGTEXT NOT NULL,
    person_history_json LONGTEXT NOT NULL,
    film_wish_json LONGTEXT NOT NULL,
    film_watched_json LONGTEXT NOT NULL,
    update_time BIGINT NOT NULL,
    CONSTRAINT fk_user_data_user_id FOREIGN KEY (user_id) REFERENCES movie_user(id) ON DELETE CASCADE
);
