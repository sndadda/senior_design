import "./StudentEvaluation.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from 'react-select';

const StudentSurvey = ({ studentName }) => {
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [surveyData, setSurveyData] = useState(null);
  const [responses, setResponses] = useState({});
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [drafts, setDrafts] = useState([]);   
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showEvaluatorModal, setShowEvaluatorModal] = useState(false);
  const [isSelfEvaluation, setIsSelfEvaluation] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  // Used to get information for dropdown
  const surveyOptions = instances.map(i => ({
    value: String(i.instance_id),
    label: `${i.form_title} (Prof. ${i.professor_name}); (due: ${new Date(i.deadline).toLocaleString("en-US", { timeZone: "UTC" })})`
  }));

  // Used to get information for dropdown
  const draftOptions = drafts.map(d => ({
    value: String(d.response_id),
  label: `${d.form_title} (Prof. ${d.professor_name}); (saved: ${new Date(d.saved_at).toLocaleString()}; due: ${new Date(d.deadline).toLocaleString("en-US", { timeZone: "UTC" })})`, instanceId: d.instance_id
  }));  
  
  const navigate = useNavigate();

  // Loads in the assigned survey's for the dropdown, as well as any saved drafts
  useEffect(() => {
    (async () => {
      const [s1, s2] = await Promise.allSettled([
        fetch(`${process.env.REACT_APP_API_URL}/api/studentsurvey/my-surveys`, { credentials: "include" }),
        fetch(`${process.env.REACT_APP_API_URL}/api/studentsurvey/my-drafts`,  { credentials: "include" }),
      ]);
  
      if (s1.status === "fulfilled" && s1.value.ok) {
        setInstances(await s1.value.json());
      }
  
      if (s2.status === "fulfilled" && s2.value.ok) {
        setDrafts(await s2.value.json());
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/studentsurvey/evaluate-choice`, {
          credentials: "include"
        });
        if (res.ok) {
          setAllStudents(await res.json());
        }
      } catch (err) {
        console.error("Could not fetch students:", err);
      }
    })();
  }, []);


  // Function for beginning a survey
  const startSurvey = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentsurvey/load/${selectedInstance}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(await res.text());
      setSurveyData(await res.json());
    } catch (err) {
      console.error("Could not load survey.", err);
      alert("Could not load survey.");
    }
  };

  const handleChange = (qId, val) =>
    setResponses(r => ({ ...r, [qId]: val }));

  const handleSaveDraft = async () => {
    if (!selectedInstance) return;
  
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentsurvey/save-draft`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceId: selectedInstance,
            answers:    responses,
            evaluatedUserId: isSelfEvaluation ? null : selectedStudentId,
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
  
      alert("Your draft has been saved.");
  
      setSurveyData(null);
  
      // reloads both lists for dropdown
      const [surveysRes, draftsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/studentsurvey/my-surveys`, { credentials: "include" }),
        fetch(`${process.env.REACT_APP_API_URL}/api/studentsurvey/my-drafts`,  { credentials: "include" }),
      ]);

      if (surveysRes.ok) setInstances(await surveysRes.json());
      if (draftsRes.ok)  setDrafts(await draftsRes.json());
  
      setSelectedInstance(null);
      setResponses({});
      setSelectedDraft(null);
    } 
    catch (err) {
      console.error("Save draft failed:", err);
      alert("Could not save draft. Please try again.");
    }
  };

  // Used to reload dropdowns
  const resetToPickers = async () => {
    setSurveyData(null);
    setSelectedInstance(null);
    setResponses({});
    setSelectedDraft(null);
    const [surveysRes, draftsRes] = await Promise.all([
      fetch(`${process.env.REACT_APP_API_URL}/api/studentsurvey/my-surveys`, { credentials: "include" }),
      fetch(`${process.env.REACT_APP_API_URL}/api/studentsurvey/my-drafts`,  { credentials: "include" }),
    ]);

    if (surveysRes.ok) setInstances(await surveysRes.json());
    if (draftsRes.ok)  setDrafts(await draftsRes.json());
  };

  const handleDiscard = () => {
    setShowDiscardModal(true);
  };
  
  const confirmDiscard = () => {
    setShowDiscardModal(false);
    resetToPickers();
  };

  const cancelDiscard = () => setShowDiscardModal(false);

  // Loads in the information for the survey draft, include the saved responses
  const continueDraft = async () => {
    if (!selectedDraft) return;
  
    const opt = draftOptions.find(o => o.value === selectedDraft);
    if (!opt) return;
  
    const instanceId = opt.instanceId;
    setSelectedInstance(instanceId);
  
    const formRes = await fetch(
      `${process.env.REACT_APP_API_URL}/api/studentsurvey/load/${instanceId}`,
      { credentials: "include" }
    );

    if (!formRes.ok) {
      alert("Could not load draft form");
      return;
    }
    const data = await formRes.json();
    setSurveyData(data);
  

    const answerRes = await fetch(
      `${process.env.REACT_APP_API_URL}/api/studentsurvey/draft-answers/${selectedDraft}`,
      { credentials: "include" }
    );

    if (!answerRes.ok) {
      console.error("Could not load saved answers");
      return;
    }
    const answers = await answerRes.json();
  
    const parsed = {};
    data.questions.forEach(q => {
      const raw = answers[q.question_id];
      if (q.question_type === "rating") {
        parsed[q.question_id] =
          raw != null
            ? parseInt(raw, 10)
            : undefined;
      } else {
        parsed[q.question_id] = raw ?? "";
      }
    });  

    setResponses(parsed);
  };
  
  
  
  const handleSubmit = (e) => {
    e.preventDefault()
  
    // Check that every question has an answer before submitting
    const unanswered = surveyData.questions.filter(q => {
      const val = responses[q.question_id];
      return val === undefined || val === null || val === "";
    });
  
    if (unanswered.length > 0) {
      alert("Please answer all questions before submitting.");
      return;
    }
  
    if (!selectedInstance) return;
    setShowSubmitConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowSubmitConfirm(false);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/studentsurvey/submit`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceId: selectedInstance,
            answers: responses,
            evaluatedUserId: isSelfEvaluation ? null : selectedStudentId
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      setShowCompletedModal(true);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Could not submit survey. Please try again.");
    }
  };



  // If there isn't a survey that is chosen yet, display the two dropdown lists for surveys and drafts
  if (!surveyData) {
    return (
      <div className="survey-form-container">
        <h1>Assigned Surveys</h1>

        {/* pick a new assigned survey to take */}
        <div>
          <label>Select a new survey:</label>
          <Select
            options={surveyOptions}
            value={
              selectedInstance == null
                ? null
                : surveyOptions.find(o => o.value === selectedInstance)
            }
            onChange={opt => setSelectedInstance(opt ? opt.value : null)}
            placeholder="— pick one —"
            maxMenuHeight={180}
            isSearchable/>
            
          <button
            onClick={() => setShowEvaluatorModal(true)}
            disabled={!selectedInstance}
            className="survey-button"
          >
            Start Survey
          </button>
        </div>

        {/* If there is a saved draft, then show */}
        {drafts.length > 0 && (
          <div style={{ marginTop: "1.5em" }}>
            <label>Continue a saved draft:</label>
            <Select
              options={draftOptions}
              value={
                selectedDraft == null
                  ? null
                  : draftOptions.find(o => o.value === selectedDraft)
              }
              onChange={opt => setSelectedDraft(opt ? opt.value : null)}
              placeholder="— pick draft —"
              maxMenuHeight={180}
              isSearchable />

            <button
              onClick={continueDraft}
              disabled={!selectedDraft}
              className="survey-button"
            >
              Continue Draft
            </button>
          </div>
        )}

        {showEvaluatorModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Who are you evaluating?</h3>
              <div style={{ marginBottom: "1em" }}>
                <button
                  className="survey-button"
                  onClick={() => {
                    setIsSelfEvaluation(true);
                    setShowEvaluatorModal(false);
                    startSurvey();
                  }}
                >
                  Myself
                </button>
                <button
                  className="survey-button"
                  onClick={() => setIsSelfEvaluation(false)}
                >
                  Another Student
                </button>
              </div>

              {!isSelfEvaluation && (
                <>
                  <label>Select a student to evaluate:</label>
                  <Select
                    options={allStudents.filter(s => s.label !== studentName)}
                    value={allStudents.find(s => s.value === selectedStudentId)}
                    onChange={opt => setSelectedStudentId(opt?.value || null)}
                    placeholder="— choose student —"
                    isSearchable
                  />
                  <button
                    className="survey-button"
                    disabled={!selectedStudentId}
                    onClick={() => {
                      setShowEvaluatorModal(false);
                      startSurvey();
                    }}
                    style={{ marginTop: "1em" }}
                  >
                    Continue
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowEvaluatorModal(false);
                  setIsSelfEvaluation(true); // reset
                  setSelectedStudentId(null); // reset
                }}
                className="survey-button"
                style={{ marginTop: "1em" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If a survey was chosen from the list, display it
  return (
    <div className="survey-form-container">
      <h1>{surveyData.form_title}</h1>
      <p>{surveyData.form_description}</p>

      <form onSubmit={handleSubmit}>
      {surveyData.questions.map(q => (
        <div key={q.question_id} className="survey-question">
          <h3>{q.question_text.replace("the student", studentName)}</h3>
      
          {q.question_type === "rating" ? (
            q.options.map((opt, idx) => (
              <label key={idx} className="survey-label">
                <input
                type="radio"
                name={String(q.question_id)}
                value={idx}
                checked={responses[q.question_id] === idx}
                onChange={() => handleChange(q.question_id, idx)}
                />
              
                <span className="choice-text">{opt}</span>
              </label>
            ))
          ) : (
            <textarea
              name={String(q.question_id)}
              value={responses[q.question_id] || ""}
              onChange={e => handleChange(q.question_id, e.target.value)}
              className="survey-textarea"
            />
          )}
        </div>
      ))}
    
        <div className="student-survey-button-row">
          <button
            type="button"
            onClick={handleDiscard}
            className="btn-discard"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={!Object.keys(responses).length}
            className="btn-save-draft"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="btn-submit"
          >
            Submit
          </button>
        </div>
      </form>

      {/* Confirmation modal for Discard */}
      {showDiscardModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Discard changes?</h3>
            <p>Are you sure you want to discard current changes made to the survey? This cannot be undone.</p>
            <button onClick={confirmDiscard} className="survey-button-discard-button">
              Yes, Discard
            </button>
            <button onClick={cancelDiscard} className="survey-button">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal for Submission */}
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm submission?</h3>
            <p>Are you sure you want to submit your responses? You will not be able to change them after submission.</p>
            <button
              onClick={confirmSubmit}
              className="survey-button-submit-button"
            >
              Yes, Submit
            </button>
            <button
              onClick={() => setShowSubmitConfirm(false)}
              className="survey-button"
           >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Completed modal for Submission */}
      {showCompletedModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Survey Completed!</h3>
            <button onClick={() => navigate("/student-dashboard")}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSurvey;
