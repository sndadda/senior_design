import './ProfessorGrades.css';
import React, { useState, useEffect } from 'react';
import Select from 'react-select';

export default function GradesPage() {
  // eslint-disable-next-line no-unused-vars
  const [courses, setCourses] = useState([]); // Values commented out for courses
  // eslint-disable-next-line no-unused-vars
  const [selectedCourse, setSelectedCourse] = useState(null); // Values commented out for courses
  const [grades, setGrades] = useState([]);
  const [sortKey, setSortKey] = useState('student_name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalAnswers, setModalAnswers] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [availableSurveys, setAvailableSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [viewingSurvey, setViewingSurvey] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [surveyDescription, setSurveyDescription] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [surveySearch, setSurveySearch] = useState('');
  const [evaluatedUserName, setEvaluatedUserName] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [surveyDeadline, setSurveyDeadline] = useState(null);

  // Get courses
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/professor/grade-course-list`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(data => {
        const opts = data.map(c => ({
          value: c.course_num,
          label: c.course_name
        }));
        setCourses([{ value: null, label: 'All Surveys' }, ...opts]);
      })
      .catch(err => {
        console.error("Failed to fetch courses:", err);
      });
  }, []);


  // If selectedCourse changes, update the grades dashboard
  useEffect(() => {
    const courseNum = selectedCourse?.value;
    const url = new URL(`${process.env.REACT_APP_API_URL}/api/professor/grades_dashboard`);
    if (courseNum !== undefined && courseNum !== null)
      url.searchParams.append('courseNum', courseNum);

    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then(data => {setGrades(data);})

      .catch(err => {
        console.error("Failed to fetch grades:", err);
      });
  }, [selectedCourse]);

  // for filtering the table
  const filtered = grades.filter(row => {
    const studentMatch = row.student_name.toLowerCase().includes(studentSearch.toLowerCase());
    const surveyTitles = [
      ...(row.assigned_titles || []),
      ...(row.completed_titles || []),
      ...(row.incomplete_titles || []),
    ].join(' ').toLowerCase();
    const surveyMatch = surveyTitles.includes(surveySearch.toLowerCase());

    return studentMatch && surveyMatch;
  });

  // for sorting columns in the table
  const sorted = [...filtered].sort((a, b) => {
    let v1 = a[sortKey], v2 = b[sortKey];
    if (typeof v1 === 'string') {
      v1 = v1.toLowerCase(); v2 = v2.toLowerCase();
    }
    if (v1 < v2) return sortAsc ? -1 : 1;
    if (v1 > v2) return sortAsc ? 1 : -1;
    return 0;
  });


  const openSurveyModal = (student) => {
    setCurrentStudent(student);
    setModalTitle(`${student.student_name}'s Evaluation Responses`);

    fetch(`${process.env.REACT_APP_API_URL}/api/professor/completed_surveys/${student.student_id}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        setAvailableSurveys(data);
        setSelectedSurvey(null);
        setModalAnswers([]);
        setShowModal(true);
      })
      .catch(err => {
        console.error("Failed to load surveys:", err);
        alert("Could not fetch completed surveys.");
      });
  };

  const handleViewSurvey = () => {
    if (!selectedSurvey) return;

    const surveyMeta = availableSurveys.find(s => s.response_id === selectedSurvey.value);
    const surveyTitle = surveyMeta?.survey_title || '';
    const description = surveyMeta?.survey_description || '';

    setEvaluatedUserName(surveyMeta?.evaluated_user_name || '');
    setSubmissionDate(surveyMeta?.submission_date
      ? new Date(surveyMeta.submission_date).toLocaleString()
      : '');

    setSurveyDeadline(surveyMeta?.deadline
    ? new Date(surveyMeta.deadline).toLocaleString("en-US", { timeZone: "UTC" })
    : '');

    setModalTitle(`${currentStudent?.student_name}'s Survey Results for: ${surveyTitle}`);
    setSurveyDescription(description);

    fetch(`${process.env.REACT_APP_API_URL}/api/professor/answers/${selectedSurvey.value}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        const grouped = {};
        data.forEach(row => {
          const qid = row.question_id;
          if (!grouped[qid]) {
            grouped[qid] = {
              question_id: qid,
              question_text: row.question_text,
              question_type: row.question_type,
              choices: [],
              answer_value: row.answer_value
            };
          }

          if (row.question_type === 'rating' && row.choice_text != null) {
            grouped[qid].choices.push({
              choice_text: row.choice_text,
              is_selected: row.is_selected,
            });
          }
        });

        const groupedAnswers = Object.values(grouped);
        setModalAnswers(groupedAnswers);
        setViewingSurvey(true);
        setShowModal(false);
      })
      .catch(err => {
        console.error("Failed to fetch answers:", err);
        alert("Failed to load answers.");
      });
  };

return (
  <div className="grades-page">
    {viewingSurvey ? (
      <div className="survey-form-container-wrapper">
        <div className="survey-answer-view-form-container">
          <h1>{modalTitle}</h1>
          {surveyDescription && <p className="survey-answer-view-description">{surveyDescription}</p>}
          <p><strong>Evaluated Student:</strong> {evaluatedUserName}</p>
          <p><strong>Submitted On:</strong> {submissionDate}</p>
          {surveyDeadline && ( <p><strong>Survey Deadline:</strong> {surveyDeadline}</p>)}
          {modalAnswers.length > 0 ? (
            <form>
              {modalAnswers.map((q, i) => (
                <div key={i} className="survey-answer-view-question">
                  <h3>{q.question_text}</h3>
                  {q.question_type === "rating" && q.choices ? (
                    <div className="read-only-multiple-choice">
                      {q.choices.map((choice, idx) => (
                        <label key={idx} className="choice-label">
                          <input
                            type="radio"
                            checked={choice.is_selected}
                            readOnly
                            disabled
                          />
                          {choice.choice_text}
                        </label>
                      ))}
                    </div>
                  ) : q.question_type === "text" ? (
                    <p className="choice-text">{q.answer_value}</p>
                  ) : (
                    <p className="choice-text">Unknown question type</p>
                  )}
                </div>
              ))}
              <div className="button-survey-grade-view-row">
                <button
                  type="button"
                  onClick={() => setViewingSurvey(false)}
                  className="survey-answer-view-button"
                >
                  Back to Grades Dashboard
                </button>
              </div>
            </form>
          ) : (
              <div className="button-survey-grade-view-row">
                <p>No answers found for this survey.</p>
                <button
                  type="button"
                  onClick={() => setViewingSurvey(false)}
                  className="survey-answer-view-button"
                >
                  Back to Grades Dashboard
                </button>
              </div>          
          )}
        </div>
      </div>
    ) : (
      <>
        <h2>Grades Dashboard</h2>
       
        <div className="grades-filter">
        {/* Code commented out for courses. Used for courses when added          
          <label>Course:</label>
          <div style={{ flex: 1 }}>
            <Select
              options={courses}
              value={selectedCourse}
              onChange={setSelectedCourse}
              placeholder="All Surveys"
            />
          </div>
          */}
          <div className="grades-search-inputs">
            <input
              type="text"
              placeholder="Search by student name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="grades-search-box"
            />
            <input
              type="text"
              placeholder="Search by survey title..."
              value={surveySearch}
              onChange={(e) => setSurveySearch(e.target.value)}
              className="grades-search-box"
            />
          </div>
        </div>
        <div className="grades-table-container">
          <table className="grades-table">
              <thead>
                <tr>
                  {['student_name','percent_complete'].map(key => (
                    <th key={key} onClick={() => {
                      if (sortKey === key) setSortAsc(!sortAsc);
                      else { setSortKey(key); setSortAsc(true); }
                    }}>
                      {({
                        student_name: 'Student',
                        percent_complete: '% Complete (All Surveys)',
                      })[key]}
                      {sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : null}
                    </th>
                  ))}
                  <th>Surveys Assigned</th>
                  <th>Surveys Not Completed</th>
                  <th>Surveys Completed</th>
                  <th>View responses</th>
                </tr>
              </thead>
            <tbody>
              {sorted.map(row => (
                <tr key={row.student_id}>
                  <td>{row.student_name}</td>
                  <td>{row.percent_complete}%</td>
                  <td>
                    <div className="cell-header">{row.total_surveys} assigned</div>
                    <div className="scroll-list">
                      {Object.entries(
                        row.assigned_titles.reduce((acc, title) => {
                          acc[title] = (acc[title] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([title, count], i) => (
                        <div key={i}>{count > 1 ? `${title} (${count})` : title}</div>
                      ))}
                    </div>
                  </td>

                  <td>
                    <div className="cell-header">
                      {row.total_surveys - row.completed_surveys} not completed
                    </div>
                    <div className="scroll-list">
                      {Object.entries(
                        row.incomplete_titles.reduce((acc, title) => {
                          acc[title] = (acc[title] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([title, count], i) => (
                        <div key={i}>{count > 1 ? `${title} (${count})` : title}</div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="cell-header">{row.completed_surveys} completed</div>
                    <div className="scroll-list">
                      {Object.entries(
                        row.completed_titles.reduce((acc, title) => {
                          acc[title] = (acc[title] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([title, count], i) => (
                        <div key={i}>{count > 1 ? `${title} (${count})` : title}</div>
                      ))}
                    </div>
                  </td>
                  <td>
                    {row.completed_surveys > 0 ? (
                      <button className="highlighted" onClick={() => openSurveyModal(row)}>
                        View
                      </button>
                    ) : (
                      <button disabled>View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal-overlay grades-modal">
            <div className="modal-content">
              <h3>{modalTitle}</h3>

              {availableSurveys.length > 0 && (
                <>
                  <label>Select a survey:</label>
                  <Select
                    options={availableSurveys.map(s => ({
                      value: s.response_id,
                      label: [
                                s.survey_title,
                                `(evaluated: ${s.evaluated_user_name})`,
                                `(submitted: ${new Date(s.submission_date).toLocaleDateString()} ${new Date(s.submission_date).toLocaleTimeString()})`
                              ].join(" ")
                              }))}
                    value={selectedSurvey}
                    onChange={setSelectedSurvey}
                    placeholder="Select a survey..."
                  />

                  <div className="modal-buttons">
                    <button onClick={handleViewSurvey} disabled={!selectedSurvey}>
                      View Survey
                    </button>
                    <button onClick={() => setShowModal(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </div>
)};
