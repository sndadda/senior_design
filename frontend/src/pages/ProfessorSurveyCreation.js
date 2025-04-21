import "./ProfessorSurveyCreation.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const QUESTION_TYPES = {
  SHORT_ANSWER: "Short Answer",
  MULTIPLE_CHOICE: "Multiple Choice",
};

const ProfessorSurveyCreation = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedSurveys, setSavedSurveys] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [surveyToDelete, setSurveyToDelete] = useState(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);

  const navigate = useNavigate();

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const [questionToRemove, setQuestionToRemove] = useState(null);

  // Add a new question of the given question type
  const addQuestion = (type) => {
    const newQuestion = {
      id: Date.now(),
      type,
      text: "",
      // for multiple choice, it starts out two empty choices
      choices: type === QUESTION_TYPES.MULTIPLE_CHOICE ? ["", ""] : [],
    };
    setQuestions((qs) => [...qs, newQuestion]);
    closeModal();
  };

  // Update question text or choice text
  const updateQuestion = (id, field, value, choiceIdx = null) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id) 
          return q;

        if (field === "text") 
          return { ...q, text: value };

        if (field === "choices") {
          const newChoices = [...q.choices];
          newChoices[choiceIdx] = value;
          return { ...q, choices: newChoices };
        }
        return q;
      })
    );
  };

  // Add a choice to a multiple‑choice question
  const addChoice = (id) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id && q.choices.length < 5 // There is a max limit of 5 choices
          ? { ...q, choices: [...q.choices, ""] }
          : q
      )
    );
  };

  // Remove a choice from MC
  const removeChoice = (id, idx) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id
          ? { ...q, choices: q.choices.filter((_, i) => i !== idx) }
          : q
      )
    );
  };

  // Deals with saving to DB
  const handleSave = async (forceOverwrite = false) => {
    const payload = {
      title,
      instructions: description,
      questions,
      forceOverwrite // If a user wants to save a survey but one with same title already exists in DB
    };
  
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/professorsurvey/save`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
  
      const text = await response.text();
  
      try {
        const data = JSON.parse(text);
  
        if (response.status === 409 && !forceOverwrite) {
          // calls the overwite modal to ask user if they want to overwite survey data
          setShowOverwriteModal(true);
        } 
        else if (response.ok) {
          alert(data.message || "Survey saved!");
          navigate("/professor_dashboard");
        }  
        else {
          alert(data.message || "Error saving survey.");
        }
      } 
      catch (jsonErr) {
        console.error("Invalid JSON response from server:", text);
        alert("Server error: invalid response");
      }
    } 
    catch (error) {
      console.error("Network or server error:", error);
      alert("Something went wrong while saving.");
    }
  };
  
  // Force overwrite and close modal
  const handleSaveWithOverwrite = () => {
    handleSave(true);
    setShowOverwriteModal(false);
  };
  
  // Close the modal without saving
  const handleCancelOverwrite = () => {
    setShowOverwriteModal(false);
  };

  const openManageModal  = () => {
    setShowLoadModal(true);
    fetchSavedSurveys();
  };

  // Gets all surveys stored in database for user
  const fetchSavedSurveys = async () => {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/professorsurvey/list`, {
      credentials: "include"
    });
    if (res.ok) {
      const list = await res.json();
      setSavedSurveys(list);
    } else {
      const error = await res.text();
      console.error("Could not fetch saved surveys:", error);
    }
  };
  
  const closeLoadModal = () => setShowLoadModal(false);
    
  // Loads from DB into survey creation page
  const loadSurvey = async (id) => {
    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/api/professorsurvey/load/${id}`,
      { credentials: "include" }
    );
    if (!res.ok) return alert("Failed to load survey");
    const data = await res.json();

    // load in from data base and map information
    const loadedQs = data.questions.map((q) => ({
      id:   q.question_id,
      type: q.question_type === "text"
              ? QUESTION_TYPES.SHORT_ANSWER
              : QUESTION_TYPES.MULTIPLE_CHOICE,
      text:    q.question_text,
      choices: q.choices
    }));

    setTitle(data.form_title);
    setDescription(data.instructions);
    setQuestions(loadedQs);
    closeLoadModal();
  };

  // Deletes a survey from the DB
  const handleDeleteSurvey = async (id) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/professorsurvey/delete/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (res.ok) {
      setSurveys(surveys.filter((s) => s.id !== id));
      setSurveyToDelete(null);
      fetchSavedSurveys();
    } else {
      alert("Failed to delete survey");
    }
  };  
  
  // Removes a question from the survey 
  const handleRemoveQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // modal for confirmtion of removing question
  const ConfirmRemoveQModal = ({ isOpen, onConfirm, onCancel, message }) => {
    if (!isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <p>{message}</p>
          <div className="modal-buttons">
            <button onClick={onConfirm} className="confirm-remove-question">
              Yes, Discard Question
            </button>
            <button onClick={onCancel} className="cancel-remove-question">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const handleConfirmRemove = () => {
    handleRemoveQuestion(questionToRemove);
    setQuestionToRemove(null);
  };
  
  const handleCancelRemove = () => {
    setQuestionToRemove(null);
  };

    // Clears all data from current survey creation page and goes back to dashboard
    const handleDiscardSurvey = () => {
      setTitle("");
      setDescription("");
      setQuestions([]);
      setShowDiscardModal(false);
      navigate("/professor_dashboard");
    };
  

  return (
    <div className="creation-container">
      <h1 className="creation-header">Create New Survey</h1>

      <div className="creation-field">
        <label>Survey Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter survey title..."
        />
      </div>

      <div className="creation-field">
        <label>Survey Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter survey description..."
          rows={3}
        />
      </div>

      <div className="questions-list">
        {questions.map((q, idx) => (
          <div key={q.id} className="question-block">
            <div className="question-header">
              <span>Q{idx + 1}:</span>
              <input
                type="text"
                value={q.text}
                onChange={(e) =>
                  updateQuestion(q.id, "text", e.target.value)
                }
                placeholder="Enter question text..."
              />
          </div>
        
        
            {/* Display Short Answer question type */}
            {q.type === QUESTION_TYPES.SHORT_ANSWER && (
              <div className="short-answer-container">
                <input type="text" disabled placeholder="Short answer text field" className="preview-short-answer"/>

              <button
                className="remove-question-button"
                onClick={() => setQuestionToRemove(idx)}
              >
                ✕ Remove Question {idx + 1}
              </button>

              <ConfirmRemoveQModal
                isOpen={questionToRemove !== null}
                onConfirm={handleConfirmRemove}
                onCancel={handleCancelRemove}
                message="Are you sure you want to discard this question?"
              />
              </div>
            )}

            {/* Display Multiple Choice question type */}
            {q.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
              <div className="choices-container">
                {q.choices.map((choice, cIdx) => (
                  <div key={cIdx} className="choice-row">
                    <input type="radio" disabled className="preview-radio"/>
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) =>
                        updateQuestion(q.id, "choices", e.target.value, cIdx)
                      }
                      placeholder={`Choice ${cIdx + 1}`}
                    />

                    <button
                      type="button"
                      onClick={() => removeChoice(q.id, cIdx)}
                      className="remove-choice-btn"
                    >
                      ✕ Remove Choice
                    </button>
                  </div>
                ))}
                

                <div className="question-actions">
                {q.choices.length < 5 && (
                  <button
                    type="button"
                    onClick={() => addChoice(q.id)}
                    className="add-choice-btn"
                  >
                    + Add Choice
                  </button>
                )}
              
                <button
                  className="remove-question-button"
                  onClick={() => setQuestionToRemove(idx)}
                >
                  ✕ Remove Question {idx + 1}
                </button>              
              </div>
            
              <ConfirmRemoveQModal
                isOpen={questionToRemove !== null}
                onConfirm={handleConfirmRemove}
                onCancel={handleCancelRemove}
                message="Are you sure you want to discard this question?"
              />
            
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button onClick={openModal} className="add-question-btn">
        + Add Question
      </button>

      <div className="creation-actions">
        <button
          onClick={() => setShowDiscardModal(true)}
          className="discard-changes-btn"
        >
          Discard Changes
        </button>

        <button onClick={openManageModal} className="manage-survey-btn">
          Manage Survey's
        </button>

        <button className="save-survey-btn" onClick={() => handleSave()}>
          Save Survey
        </button>
      </div>


      {/* Display available question types when adding new question */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Select Question Type</h3>
            <button
              onClick={() => addQuestion(QUESTION_TYPES.SHORT_ANSWER)}
              className="modal-btn"
            >
              Short Answer
            </button>

            <button
              onClick={() => addQuestion(QUESTION_TYPES.MULTIPLE_CHOICE)}
              className="modal-btn"
            >
              Multiple Choice
            </button>

            <button onClick={closeModal} className="modal-close-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Discard Survey Confirmation Modal */}
      {showDiscardModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>Are you sure you want to discard the current changes made to this survey? 
            If you do not want to lose these changes, please save instead.</p>
            <p>This action cannot be undone.</p>
            <div className="modal-buttons">
              <button
                onClick={handleDiscardSurvey}
                className="confirm-discard"
              >
                Yes, discard changes made to survey
              </button>
              <button
                onClick={() => setShowDiscardModal(false)}
                className="cancel-discard"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to display survey's that can be loaded in */}
      {/* This shows up when pressing the "Manage Survey's" button */}
      {showLoadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Choose a Survey to Load or Delete</h3>
            <ul className="survey-list">
              {savedSurveys.map((s) => (
                <div className="manaage-survey-buttons">
                  <li key={`${s.id}-${s.title}`}>
                    <button
                      className="survey-list-item"
                      onClick={() => loadSurvey(s.id)}
                    >
                      {`Load: ${s.title}`}
                    </button>
                    <button
                      onClick={() => setSurveyToDelete(s)}
                      className="X-del-survey-button"
                    >
                      ✕ {`Delete: ${s.title}`}
                    </button>
                  </li>
                </div>
              ))}
            </ul>
            <button onClick={closeLoadModal} className="modal-close-btn">
              Cancel
            </button>
      
            {/* Nested modal for deleting a survey that is saved */}
            {/* This shows at the bottom of the load modal when the "X" button is pressed */}
            {surveyToDelete && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h2 className="delete-header">Delete Survey</h2>
                  <p className="mb-4">
                    Are you sure you want to delete{" "}
                    <strong>{surveyToDelete.title}</strong>?
                  </p>
                  <div className="delete-buttons">
                    <button
                      onClick={() => handleDeleteSurvey(surveyToDelete.id)}
                      className="confirm-del-survey-button"
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => setSurveyToDelete(null)}
                      className="cancel-del-survey-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modal to display the overwrite modal when a user wants to save a survey with the same title*/}
      {/* as another survey in the DB that was created by the user*/}
      {showOverwriteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Survey already exists!</h3>
            <p>Do you want to overwrite the existing survey?</p>
            <div className="modal-buttons">
              <button onClick={handleSaveWithOverwrite} className="confirm-overwrite">
                Yes, overwrite existing survey
              </button>
              <button onClick={handleCancelOverwrite} className="cancel-overwrite">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
       
    </div>
  );

};

export default ProfessorSurveyCreation;
