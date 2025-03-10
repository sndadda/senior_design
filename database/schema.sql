
DO $$ 
BEGIN 
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dragon_insight') THEN
      CREATE DATABASE dragon_insight;
   END IF;
END $$;


CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    username VARCHAR(70) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL CHECK (email LIKE '%@drexel.edu'),
    password_hash VARCHAR(255) NOT NULL CHECK (LENGTH(password_hash) >= 8),
    role VARCHAR(10) NOT NULL CHECK (role IN ('student', 'professor'))
);

CREATE TABLE IF NOT EXISTS Course (
    course_num VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Section (
    section_id SERIAL PRIMARY KEY,
    course_num VARCHAR(10) REFERENCES Course(course_num) ON DELETE CASCADE,
    term VARCHAR(10) NOT NULL CHECK (term IN ('Fall', 'Winter', 'Spring', 'Summer')),
    year INT NOT NULL CHECK (year >= 2000 AND year <= 2030),
    section_num INT NOT NULL CHECK (section_num > 0)
);

CREATE TABLE IF NOT EXISTS SectionProfessors (
    section_id INT REFERENCES Section(section_id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (section_id, user_id)
);

CREATE TABLE IF NOT EXISTS Enrollments (
    stud_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    section_id INT REFERENCES Section(section_id) ON DELETE CASCADE,
    PRIMARY KEY (stud_id, section_id)
);


CREATE TABLE IF NOT EXISTS Team (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL
);


CREATE TABLE IF NOT EXISTS TeamMembers (
    team_id INT REFERENCES Team(team_id) ON DELETE CASCADE,
    stud_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, stud_id)
);

CREATE TABLE IF NOT EXISTS SurveyForms (
    survey_form_id SERIAL PRIMARY KEY,
    created_by INT REFERENCES Users(user_id) ON DELETE SET NULL,
    form_title VARCHAR(100) NOT NULL,
    instructions TEXT,
    is_default BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_default_survey ON SurveyForms (is_default) WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS SurveyInstances (
    instance_id SERIAL PRIMARY KEY,
    survey_form_id INT REFERENCES SurveyForms(survey_form_id) ON DELETE CASCADE,
    section_id INT REFERENCES Section(section_id) ON DELETE CASCADE,
    deadline TIMESTAMP NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS SurveyQuestions (
    question_id SERIAL PRIMARY KEY,
    survey_form_id INT REFERENCES SurveyForms(survey_form_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(10) NOT NULL CHECK (question_type IN ('rating', 'text')),
    max_rating INT CHECK (max_rating BETWEEN 1 AND 10)
);

CREATE TABLE IF NOT EXISTS SurveyResponses (
    response_id SERIAL PRIMARY KEY,
    survey_form_id INT REFERENCES SurveyForms(survey_form_id) ON DELETE CASCADE,
    section_id INT REFERENCES Section(section_id) ON DELETE CASCADE,
    submitted_by INT REFERENCES Users(user_id) ON DELETE CASCADE,
    evaluated_user INT REFERENCES Users(user_id) ON DELETE CASCADE,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS SurveyAnswers (
    answer_id SERIAL PRIMARY KEY,
    response_id INT REFERENCES SurveyResponses(response_id) ON DELETE CASCADE,
    question_id INT REFERENCES SurveyQuestions(question_id) ON DELETE CASCADE,
    answer_value VARCHAR(255) NOT NULL
);


CREATE TABLE IF NOT EXISTS Grades (
    grade_id SERIAL PRIMARY KEY,
    survey_id INT REFERENCES SurveyForms(survey_form_id) ON DELETE CASCADE,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
    grade INT NOT NULL CHECK (grade BETWEEN 0 AND 100)
);
