import { useEffect, useState } from "react";
import Select from "react-select";
import "./EvaluationResults.css";

const EvaluationResults = () => {
  const [completedSurveys, setCompletedSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [results, setResults] = useState(null);

  // Load completed surveys
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/evaluations/completed`, { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => setCompletedSurveys(data))
      .catch(err => console.error("Error fetching survey list:", err));
  }, []);

  // Fetch survey results
  const fetchResults = async (surveyId) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/evaluations/results/${surveyId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch survey results.");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Could not load evaluation results.");
    }
  };

  const surveyOptions = completedSurveys.map(s => ({
    value: s.survey_id,
    label: `${s.form_title} - ${new Date(s.submitted_at).toLocaleDateString()}`
  }));

  return (
    <div className="results-container">
      <h2>Evaluation Results</h2>

      <Select
        options={surveyOptions}
        onChange={opt => {
          setSelectedSurveyId(opt.value);
          fetchResults(opt.value);
        }}
        placeholder="Select a completed survey..."
      />

      {!results && <p className="muted">Select a survey to view results.</p>}

      {results && (
        <div className="results-summary">
          <h3>{results.form_title}</h3>
          <p>{results.form_description}</p>

          {results.questions.map((q, idx) => (
            <div key={idx} className="result-block">
              <h4>{q.question_text}</h4>
              
              {q.question_type === "rating" && (
                <p>Average Rating: <strong>{q.average_rating.toFixed(2)} / 5</strong></p>
              )}

              {q.question_type === "text" && (
                <ul>
                  {q.comments.map((comment, i) => (
                    <li key={i}>"{comment}"</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvaluationResults;
