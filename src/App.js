import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState(() => {
    // Load tasks from localStorage on initial render with backup fallback
    const loadTasksWithBackup = () => {
      try {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          // Validate that it's an array
          if (Array.isArray(parsedTasks)) {
            // Filter out tasks older than 2 days that are completed
            const filteredTasks = parsedTasks.filter(task => {
              // Basic task validation
              if (!task || typeof task !== 'object' || !task.id) {
                return false;
              }
              if (task.completed) {
                const completionTime = new Date(task.completedAt);
                const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
                return completionTime > twoDaysAgo;
              }
              return true;
            });
            return filteredTasks;
          } else {
            console.warn('Invalid tasks data found in localStorage, trying backup...');
          }
        }
      } catch (error) {
        console.error('Error loading tasks from localStorage:', error);
      }

      // Try to restore from backup if main load failed
      try {
        const backup = localStorage.getItem('tasks_backup');
        if (backup) {
          const parsedBackup = JSON.parse(backup);
          if (parsedBackup.truncated) {
            console.warn('Restoring from truncated backup for tasks');
            return parsedBackup.data || [];
          } else if (Array.isArray(parsedBackup)) {
            console.info('Successfully restored tasks from backup');
            const filteredTasks = parsedBackup.filter(task => {
              if (!task || typeof task !== 'object' || !task.id) {
                return false;
              }
              if (task.completed) {
                const completionTime = new Date(task.completedAt);
                const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
                return completionTime > twoDaysAgo;
              }
              return true;
            });
            return filteredTasks;
          }
        }
      } catch (backupError) {
        console.error('Error restoring backup for tasks:', backupError);
      }

      console.warn('No valid tasks data found, starting fresh');
      return [];
    };

    return loadTasksWithBackup();
  });
  const [inputValue, setInputValue] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      return saved ? JSON.parse(saved) : false;
    } catch (error) {
      console.error('Error loading dark mode from localStorage:', error);
      return false;
    }
  });

  // Important Stuff state
  const [showImportantStuff, setShowImportantStuff] = useState(false);
  const [importantCards, setImportantCards] = useState(() => {
    // Load important cards with fallback to backup
    const loadImportantCards = () => {
      try {
        const saved = localStorage.getItem('importantCards');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Validate card structure
            const validCards = parsed.filter(card =>
              card &&
              typeof card === 'object' &&
              card.id &&
              card.title &&
              card.content
            );
            return validCards;
          } else {
            console.warn('Invalid important cards data found, trying backup...');
          }
        }
      } catch (error) {
        console.error('Error loading important cards from localStorage:', error);
      }

      // Try to restore from backup
      try {
        const backup = localStorage.getItem('importantCards_backup');
        if (backup) {
          const parsedBackup = JSON.parse(backup);
          if (parsedBackup.truncated) {
            console.warn('Restoring from truncated backup for important cards');
            return parsedBackup.data || [];
          } else if (Array.isArray(parsedBackup)) {
            console.info('Successfully restored important cards from backup');
            const validCards = parsedBackup.filter(card =>
              card &&
              typeof card === 'object' &&
              card.id &&
              card.title &&
              card.content
            );
            return validCards;
          }
        }
      } catch (backupError) {
        console.error('Error restoring backup for important cards:', backupError);
      }

      console.warn('No valid important cards data found, starting fresh');
      return [];
    };

    return loadImportantCards();
  });
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [viewingCard, setViewingCard] = useState(null);

  // Edit states
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');
  const [editingCardContent, setEditingCardContent] = useState('');
  
  
  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tasks') {
        try {
          if (e.newValue) {
            const newTasks = JSON.parse(e.newValue);
            if (Array.isArray(newTasks)) {
              setTasks(newTasks);
            }
          } else {
            setTasks([]);
          }
        } catch (error) {
          console.error('Error parsing tasks from storage event:', error);
        }
      } else if (e.key === 'importantCards') {
        try {
          if (e.newValue) {
            const newCards = JSON.parse(e.newValue);
            if (Array.isArray(newCards)) {
              setImportantCards(newCards);
            }
          } else {
            setImportantCards([]);
          }
        } catch (error) {
          console.error('Error parsing important cards from storage event:', error);
        }
      } else if (e.key === 'darkMode') {
        try {
          setDarkMode(e.newValue ? JSON.parse(e.newValue) : false);
        } catch (error) {
          console.error('Error parsing dark mode from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-scroll to bottom whenever tasks change
  useEffect(() => {
    setTimeout(() => {
      const taskListContainer = document.querySelector('.task-list-container');
      if (taskListContainer) {
        taskListContainer.scrollTop = taskListContainer.scrollHeight;
      }
    }, 100);
  }, [tasks]);

  // Safe localStorage save function with backup
  const safeSaveToLocalStorage = (key, data) => {
    try {
      const dataString = JSON.stringify(data);
      localStorage.setItem(key, dataString);

      // Create backup for critical data
      if (key === 'tasks' || key === 'importantCards') {
        localStorage.setItem(`${key}_backup`, dataString);
        localStorage.setItem(`${key}_timestamp`, Date.now().toString());
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, trying to clear old data...');
        try {
          // Clear old backups first
          const tasksBackup = localStorage.getItem('tasks_backup');
          const cardsBackup = localStorage.getItem('importantCards_backup');

          // Try to remove old backups and save again
          localStorage.removeItem('tasks_backup');
          localStorage.removeItem('importantCards_backup');
          localStorage.setItem(key, JSON.stringify(data));

          // Create new backup with smaller data
          if (key === 'tasks' || key === 'importantCards') {
            const minimalData = {
              data: data.slice(0, 100), // Keep only first 100 items
              truncated: true,
              timestamp: Date.now()
            };
            localStorage.setItem(`${key}_backup`, JSON.stringify(minimalData));
          }
        } catch (fallbackError) {
          console.error('Fallback save also failed:', fallbackError);
        }
      }
    }
  };

  // Restore from backup if main data is corrupted
  const restoreFromBackup = (key) => {
    try {
      const backup = localStorage.getItem(`${key}_backup`);
      const timestamp = localStorage.getItem(`${key}_timestamp`);

      if (backup && timestamp) {
        const backupAge = Date.now() - parseInt(timestamp);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (backupAge < maxAge) {
          const parsedBackup = JSON.parse(backup);

          // Check if it's truncated backup
          if (parsedBackup.truncated) {
            console.warn(`Restoring from truncated backup for ${key}`);
            return parsedBackup.data;
          } else {
            console.info(`Restoring from backup for ${key}`);
            return parsedBackup;
          }
        } else {
          console.warn(`Backup for ${key} is too old (${backupAge}ms)`);
          localStorage.removeItem(`${key}_backup`);
          localStorage.removeItem(`${key}_timestamp`);
        }
      }
    } catch (error) {
      console.error(`Error restoring backup for ${key}:`, error);
    }
    return null;
  };

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    safeSaveToLocalStorage('tasks', tasks);
  }, [tasks]);

  // Save dark mode preference
  useEffect(() => {
    safeSaveToLocalStorage('darkMode', darkMode);
  }, [darkMode]);

  // Save important cards to localStorage
  useEffect(() => {
    safeSaveToLocalStorage('importantCards', importantCards);
  }, [importantCards]);

  // Clean up completed tasks older than 2 days and health check
  useEffect(() => {
    const interval = setInterval(() => {
      // Clean up old completed tasks
      setTasks(prevTasks =>
        prevTasks.filter(task => {
          if (task.completed) {
            const completionTime = new Date(task.completedAt);
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            return completionTime > twoDaysAgo;
          }
          return true;
        })
      );

      // Perform data health check
      const dataHealthCheck = () => {
        try {
          // Check localStorage accessibility
          const testKey = 'health_check_' + Date.now();
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);

          // Validate tasks data structure
          const tasksData = localStorage.getItem('tasks');
          if (tasksData) {
            const parsed = JSON.parse(tasksData);
            if (!Array.isArray(parsed)) {
              console.warn('Tasks data corruption detected, attempting backup restore');
              const backup = restoreFromBackup('tasks');
              if (backup) {
                safeSaveToLocalStorage('tasks', backup);
              }
            }
          }

          // Validate important cards data structure
          const cardsData = localStorage.getItem('importantCards');
          if (cardsData) {
            const parsed = JSON.parse(cardsData);
            if (!Array.isArray(parsed)) {
              console.warn('Important cards data corruption detected, attempting backup restore');
              const backup = restoreFromBackup('importantCards');
              if (backup) {
                safeSaveToLocalStorage('importantCards', backup);
              }
            }
          }

          // Clean up old backups (older than 30 days)
          const maxBackupAge = 30 * 24 * 60 * 60 * 1000;
          const tasksTimestamp = localStorage.getItem('tasks_timestamp');
          const cardsTimestamp = localStorage.getItem('importantCards_timestamp');

          if (tasksTimestamp && (Date.now() - parseInt(tasksTimestamp)) > maxBackupAge) {
            localStorage.removeItem('tasks_backup');
            localStorage.removeItem('tasks_timestamp');
          }

          if (cardsTimestamp && (Date.now() - parseInt(cardsTimestamp)) > maxBackupAge) {
            localStorage.removeItem('importantCards_backup');
            localStorage.removeItem('importantCards_timestamp');
          }

        } catch (error) {
          console.error('Data health check failed:', error);
        }
      };

      dataHealthCheck();
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const newTask = {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false,
        createdAt: Date.now(),
        completedAt: null
      };
      setTasks([...tasks, newTask]);
      setInputValue('');

      // Auto-scroll to bottom after adding new task
      setTimeout(() => {
        const taskListContainer = document.querySelector('.task-list-container');
        if (taskListContainer) {
          taskListContainer.scrollTop = taskListContainer.scrollHeight;
        }
      }, 100);
    }
  };

  const handleTaskComplete = (taskId) => {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.classList.add('completing');
      setTimeout(() => {
        setTasks(tasks.map(task =>
          task.id === taskId
            ? { ...task, completed: true, completedAt: new Date().toISOString() }
            : task
        ));
      }, 800);
    } else {
      setTasks(tasks.map(task =>
        task.id === taskId
          ? { ...task, completed: true, completedAt: new Date().toISOString() }
          : task
      ));
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Important Stuff handlers
  const handleAddImportantCard = () => {
    if (newCardTitle.trim() && newCardContent.trim()) {
      const newCard = {
        id: Date.now(),
        title: newCardTitle.trim(),
        content: newCardContent.trim(),
        createdAt: new Date().toISOString(),
        color: getRandomCardColor()
      };
      setImportantCards([...importantCards, newCard]);
      setNewCardTitle('');
      setNewCardContent('');
      setShowAddCard(false);
    }
  };

  const handleDeleteCard = (cardId) => {
    setImportantCards(importantCards.filter(card => card.id !== cardId));
    if (viewingCard && viewingCard.id === cardId) {
      setViewingCard(null);
    }
  };

  const getRandomCardColor = () => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Task editing handlers
  const handleStartEditTask = (taskId, currentText) => {
    setEditingTaskId(taskId);
    setEditingTaskText(currentText);
  };

  const handleSaveEditTask = () => {
    if (editingTaskText.trim() && editingTaskId !== null) {
      setTasks(tasks.map(task =>
        task.id === editingTaskId
          ? { ...task, text: editingTaskText.trim() }
          : task
      ));
      setEditingTaskId(null);
      setEditingTaskText('');
    }
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  // Card editing handlers
  const handleStartEditCard = (card) => {
    setEditingCardId(card.id);
    setEditingCardTitle(card.title);
    setEditingCardContent(card.content);
  };

  const handleSaveEditCard = () => {
    if (editingCardTitle.trim() && editingCardContent.trim() && editingCardId !== null) {
      setImportantCards(importantCards.map(card =>
        card.id === editingCardId
          ? { ...card, title: editingCardTitle.trim(), content: editingCardContent.trim() }
          : card
      ));
      setEditingCardId(null);
      setEditingCardTitle('');
      setEditingCardContent('');
      setViewingCard(null);
    }
  };

  const handleCancelEditCard = () => {
    setEditingCardId(null);
    setEditingCardTitle('');
    setEditingCardContent('');
  };

  
  return (
    <div className={`App ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="dark-mode-toggle">
        <button onClick={toggleDarkMode} className="mode-toggle-btn">
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="important-stuff-toggle">
        <button onClick={() => setShowImportantStuff(true)} className="important-stuff-btn" title="Important Stuff">
          📌
        </button>
      </div>

      <div className="task-list-container">
        <div className="task-list">
          {tasks
            .filter(task => !task.completed)
            .sort((a, b) => a.createdAt - b.createdAt)
            .map(task => (
              <div key={task.id} className="task-item" data-task-id={task.id}>
                {editingTaskId === task.id ? (
                  <div className="edit-task-form">
                    <input
                      type="text"
                      className="edit-task-input"
                      value={editingTaskText}
                      onChange={(e) => setEditingTaskText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSaveEditTask();
                        if (e.key === 'Escape') handleCancelEditTask();
                      }}
                      autoFocus
                    />
                    <div className="edit-task-actions">
                      <button
                        className="save-edit-btn"
                        onClick={handleSaveEditTask}
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        className="cancel-edit-btn"
                        onClick={handleCancelEditTask}
                        title="Cancel"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="task-text">{task.text}</span>
                    <div className="task-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleStartEditTask(task.id, task.text)}
                        title="Edit task"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleTaskComplete(task.id)}
                        title="Mark as done"
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            className="task-input"
            placeholder="What needs to be done?"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleInputKeyPress}
          />
          <button
            className="send-btn"
            onClick={() => handleInputKeyPress({ key: 'Enter' })}
            disabled={!inputValue.trim()}
          >
            ➤
          </button>
        </div>
      </div>

      {/* Important Stuff Popup */}
      {showImportantStuff && (
        <div className="popup-overlay" onClick={() => setShowImportantStuff(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h2 className="popup-title">📌 Important Stuff</h2>
              <button
                className="close-popup-btn"
                onClick={() => setShowImportantStuff(false)}
              >
                ×
              </button>
            </div>

            <div className="popup-body">
              {importantCards.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <p>No important stuff yet. Add your first card!</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {importantCards.map(card => (
                    <div
                      key={card.id}
                      className="card-preview"
                      style={{ background: card.color }}
                      onClick={() => setViewingCard(card)}
                    >
                      <h3 className="card-preview-title">{card.title}</h3>
                      <p className="card-preview-content">{card.content.substring(0, 100)}...</p>
                      <div className="card-preview-footer">
                        <span className="card-date">
                          {new Date(card.createdAt).toLocaleDateString()}
                        </span>
                        <div className="card-actions">
                          <button
                            className="card-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditCard(card);
                            }}
                            title="Edit card"
                          >
                            ✏️
                          </button>
                          <button
                            className="card-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCard(card.id);
                            }}
                            title="Delete card"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="add-card-btn"
                onClick={() => setShowAddCard(true)}
              >
                + Add New Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Popup */}
      {showAddCard && (
        <div className="popup-overlay" onClick={() => setShowAddCard(false)}>
          <div className="popup-content add-card-content" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h2 className="popup-title">📝 Create New Card</h2>
              <button
                className="close-popup-btn"
                onClick={() => setShowAddCard(false)}
              >
                ×
              </button>
            </div>

            <div className="add-card-form">
              <input
                type="text"
                className="card-title-input"
                placeholder="Card title..."
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                maxLength={100}
              />
              <textarea
                className="card-content-input"
                placeholder="Write your important stuff here..."
                value={newCardContent}
                onChange={(e) => setNewCardContent(e.target.value)}
                rows={8}
                maxLength={1000}
              />
              <div className="add-card-actions">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddCard(false);
                    setNewCardTitle('');
                    setNewCardContent('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="save-card-btn"
                  onClick={handleAddImportantCard}
                  disabled={!newCardTitle.trim() || !newCardContent.trim()}
                >
                  Save Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Card Popup */}
      {viewingCard && (
        <div className="popup-overlay" onClick={() => {
          if (editingCardId === null) setViewingCard(null);
        }}>
          <div className="popup-content view-card-content" onClick={e => e.stopPropagation()}>
            {editingCardId === viewingCard.id ? (
              // Edit mode
              <>
                <div className="view-card-header" style={{ background: viewingCard.color }}>
                  <input
                    type="text"
                    className="edit-card-title-input"
                    value={editingCardTitle}
                    onChange={(e) => setEditingCardTitle(e.target.value)}
                    placeholder="Card title..."
                  />
                  <div className="view-card-actions">
                    <button
                      className="save-edit-card-btn"
                      onClick={handleSaveEditCard}
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      className="cancel-edit-card-btn"
                      onClick={handleCancelEditCard}
                      title="Cancel"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="view-card-body">
                  <textarea
                    className="edit-card-content-input"
                    value={editingCardContent}
                    onChange={(e) => setEditingCardContent(e.target.value)}
                    placeholder="Write your important stuff here..."
                    rows={10}
                    autoFocus
                  />
                  <div className="card-meta">
                    <p className="card-created-date">
                      Created: {new Date(viewingCard.createdAt).toLocaleDateString()} at {new Date(viewingCard.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              // View mode
              <>
                <div className="view-card-header" style={{ background: viewingCard.color }}>
                  <h2 className="view-card-title">{viewingCard.title}</h2>
                  <div className="view-card-actions">
                    <button
                      className="view-card-edit-btn"
                      onClick={() => handleStartEditCard(viewingCard)}
                      title="Edit card"
                    >
                      ✏️
                    </button>
                    <button
                      className="view-card-delete-btn"
                      onClick={() => handleDeleteCard(viewingCard.id)}
                      title="Delete card"
                    >
                      🗑️
                    </button>
                    <button
                      className="close-popup-btn"
                      onClick={() => setViewingCard(null)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="view-card-body">
                  <div className="card-content-text">{viewingCard.content}</div>
                  <div className="card-meta">
                    <p className="card-created-date">
                      Created: {new Date(viewingCard.createdAt).toLocaleDateString()} at {new Date(viewingCard.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
