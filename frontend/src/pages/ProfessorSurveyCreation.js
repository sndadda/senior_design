import "./ProfessorSurveyCreation.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const QUESTION_TYPES = {
  SHORT_ANSWER: "Short Answer",
  MULTIPLE_CHOICE: "Multiple Choice",
};

const ProfessorSurveyCreation = () => {
  // Deals with saving changes locally for testing (should be changed for future) 
  // Changes are only discarded when pressing 'Discard Survey' button
  const [title, setTitle] = useState(() => localStorage.getItem("survey_title") || "");
  const [description, setDescription] = useState(() => localStorage.getItem("survey_description") || "");
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem("survey_questions");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showModal, setShowModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const navigate = useNavigate();

  // Deals with saving changes locally for testing (should be changed for future)
  // Changes are only discarded when pressing 'Discard Survey' button
  useEffect(() => {
    localStorage.setItem("survey_title", title);
  }, [title]);
  
  useEffect(() => {
    localStorage.setItem("survey_description", description);
  }, [description]);
  
  useEffect(() => {
    localStorage.setItem("survey_questions", JSON.stringify(questions));
  }, [questions]);

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
  // There is a max limit of 5 choice (possibly change?)
  const addChoice = (id) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id && q.choices.length < 5
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

  const handleSave = () => {
    // TODO: Add functionality for saving survey information to backend in future
    console.log({ title, description, questions });
  };

  const handleDiscardSurvey = () => {
    setTitle("");
    setDescription("");
    setQuestions([]);
    
    // Removes locally saved changes
    localStorage.removeItem("survey_title");
    localStorage.removeItem("survey_description");
    localStorage.removeItem("survey_questions");
    setShowDiscardModal(false);
    navigate("/professor_dashboard");
  };

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
            <button onClick={onConfirm} className="confirm-remove">
              Yes, Discard
            </button>
            <button onClick={onCancel} className="cancel-remove">
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
          className="discard-survey-btn"
        >
          Discard Survey
        </button>

        <button onClick={handleSave} className="save-survey-btn">
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
            <p>Are you sure you want to discard this survey? This cannot be undone.</p>
            <div className="modal-buttons">
              <button
                onClick={handleDiscardSurvey}
                className="confirm-remove"
              >
                Yes, Discard Survey
              </button>
              <button
                onClick={() => setShowDiscardModal(false)}
                className="cancel-remove"
              >
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
