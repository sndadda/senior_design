import { useEffect, useState } from "react";
import Select from "react-select";
import "./EvaluationResults.css";

const EvaluationResults = () => {
  const [completedSurveys, setCompletedSurveys] = useState([]);
  const [results, setResults] = useState(null);

  // Load completed surveys
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/studentgradesroutes/completed`, { credentials: "include" })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => setCompletedSurveys(data))
      .catch(err => console.error("Error fetching survey list:", err));
  }, []);

  // Fetch survey results
  const fetchResults = async (surveyId) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentgradesroutes/results/${surveyId}`,
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
    label: `${s.form_title} - ${new Date(s.submitted_at).toLocaleString()}`
  }));

  return (
    <div className="results-container">
      <h2>Evaluation Results</h2>

      <Select
        options={surveyOptions}
        onChange={opt => {
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
                <>
                  <p>Average Rating: <strong>{(q.average_rating + 1).toFixed(2)} / {q.max_rating}</strong></p>
                  {q.choices && q.choices.length > 0 && (
                    <p>Choice:{" "}<strong>{q.choices[Math.round(q.average_rating)] || "N/A"}</strong></p>
                  )}
                </>
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
