import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sun, Moon, Pin, Archive } from 'lucide-react';
import './App.css';

// Reaction emojis for picker (WhatsApp style)
const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🙏'];

function App() {
  const taskRefs = useRef({});
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks)) {
          return parsedTasks.filter(task => task && typeof task === 'object' && task.id);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
    return [];
  });

  const [inputValue, setInputValue] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Archive state
  const [showArchive, setShowArchive] = useState(false);

  // Important Stuff state
  const [showImportantStuff, setShowImportantStuff] = useState(false);
  const [importantCards, setImportantCards] = useState(() => {
    try {
      const saved = localStorage.getItem('importantCards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(card => card && typeof card === 'object' && card.id);
        }
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    }
    return [];
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

  // Emoji picker state (WhatsApp style bottom sheet)
  const [emojiPickerTaskId, setEmojiPickerTaskId] = useState(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });

  // Swipe states
  const [swipeTaskId, setSwipeTaskId] = useState(null);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Refs for storing callbacks to avoid dependency issues
  const onDoubleClickRef = useRef(null);
  const onClickRef = useRef(null);
  const doubleClickTimeoutRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  // Double click handler for edit mode
  const handleTaskDoubleClick = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === 'archived') return;

    setEditingTaskId(taskId);
    setEditingTaskText(task.text);
  }, [tasks]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Bulk action dialog state
  const [bulkActionDialog, setBulkActionDialog] = useState(null);
  const [bulkConfirmInput, setBulkConfirmInput] = useState('');
  const [deleteArchiveCheckbox, setDeleteArchiveCheckbox] = useState(false);
  const [archiveDeleteConfirmDialog, setArchiveDeleteConfirmDialog] = useState(null);



  // Single click handler for emoji picker
  const handleTaskClick = useCallback((e, taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === 'archived') return;

    // Open emoji picker for todo, in-progress, and done tasks
    if (task.status === 'todo' || task.status === 'in-progress' || task.status === 'done') {
      // Calculate position below the task
      const taskElement = taskRefs.current[taskId];
      if (taskElement) {
        const rect = taskElement.getBoundingClientRect();
        setEmojiPickerPosition({
          top: rect.bottom + 8,
          left: rect.left
        });
      }
      setEmojiPickerTaskId(taskId);
    }
  }, [tasks]);

  // Update refs when callbacks change
  onDoubleClickRef.current = handleTaskDoubleClick;
  onClickRef.current = handleTaskClick;

  // Optimized double click handler - inline to avoid dependency issues
  const handleTaskInteract = useCallback((e, taskId) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTimeRef.current;

    if (timeDiff < 250) {
      // Double click detected
      if (doubleClickTimeoutRef.current) {
        clearTimeout(doubleClickTimeoutRef.current);
        doubleClickTimeoutRef.current = null;
      }
      if (onDoubleClickRef.current) {
        onDoubleClickRef.current(taskId);
      }
      lastClickTimeRef.current = 0;
    } else {
      // Single click - wait to see if it becomes a double click
      lastClickTimeRef.current = currentTime;
      doubleClickTimeoutRef.current = setTimeout(() => {
        doubleClickTimeoutRef.current = null;
        if (onClickRef.current) {
          onClickRef.current(e, taskId);
        }
      }, 250);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
    } catch (error) {
      console.error('Error saving dark mode:', error);
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem('importantCards', JSON.stringify(importantCards));
    } catch (error) {
      console.error('Error saving cards:', error);
    }
  }, [importantCards]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const newTask = {
        id: Date.now(),
        text: inputValue.trim(),
        status: 'todo',
        reaction: null,
        createdAt: Date.now()
      };
      setTasks([...tasks, newTask]);
      setInputValue('');
    }
  };

  // Swipe handlers
  const handleSwipeStart = (e, taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === 'archived') return;

    setSwipeTaskId(taskId);
    setSwipeStartX(e.clientX || e.touches?.[0]?.clientX || 0);
  };

  const handleSwipeMove = (e) => {
    if (swipeTaskId === null) return;

    const currentX = e.clientX || e.touches?.[0]?.clientX || 0;
    const offset = currentX - swipeStartX;

    // Strong resistance - limit swipe to max 60px
    const maxSwipe = 60;
    const resistance = 0.2; // Much stronger resistance
    let clampedOffset = Math.min(0, offset);

    // Apply resistance after passing maxSwipe
    if (clampedOffset < -maxSwipe) {
      clampedOffset = -maxSwipe + ((clampedOffset + maxSwipe) * resistance);
    }

    setSwipeOffset(clampedOffset);
  };

  const handleSwipeEnd = (taskId) => {
    if (swipeTaskId !== taskId) {
      setSwipeOffset(0);
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setSwipeOffset(0);
      setSwipeTaskId(null);
      return;
    }

    // Higher threshold: 70px to trigger action (requires deliberate swipe)
    if (swipeOffset < -70) {
      if (task.status === 'todo') {
        // Move to in-progress with green emoji
        setTasks(tasks.map(t =>
          t.id === taskId ? { ...t, status: 'in-progress', reaction: '🟢' } : t
        ));
      } else if (task.status === 'in-progress') {
        // Move to done
        setTasks(tasks.map(t =>
          t.id === taskId ? { ...t, status: 'done', reaction: '✅' } : t
        ));
      } else if (task.status === 'done') {
        // Confirm before archiving
        setConfirmDialog({
          title: 'Archive Task',
          message: 'Move this task to archive?',
          onConfirm: () => {
            setTasks(tasks.map(t =>
              t.id === taskId
                ? { ...t, status: 'archived', completedAt: new Date().toISOString() }
                : t
            ));
            setConfirmDialog(null);
          }
        });
      }
    }

    // Bouncy return
    setSwipeOffset(0);
    setSwipeTaskId(null);
  };

  // Context menu handlers
  const handleContextMenu = (e, taskId) => {
    e.preventDefault();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setContextMenu(task);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextAction = (action) => {
    if (!contextMenu) return;

    switch (action) {
      case 'edit':
        setEditingTaskId(contextMenu.id);
        setEditingTaskText(contextMenu.text);
        break;
      case 'moveTodo':
        setTasks(tasks.map(t =>
          t.id === contextMenu.id ? { ...t, status: 'todo' } : t
        ));
        break;
      case 'moveInProgress':
        setTasks(tasks.map(t =>
          t.id === contextMenu.id ? { ...t, status: 'in-progress', reaction: '🟢' } : t
        ));
        break;
      case 'moveDone':
        setTasks(tasks.map(t =>
          t.id === contextMenu.id ? { ...t, status: 'done', reaction: '✅' } : t
        ));
        break;
      case 'moveArchive':
        setConfirmDialog({
          title: 'Archive Task',
          message: 'Move this task to archive?',
          onConfirm: () => {
            setTasks(tasks.map(t =>
              t.id === contextMenu.id
                ? { ...t, status: 'archived', completedAt: new Date().toISOString() }
                : t
            ));
            setConfirmDialog(null);
            closeContextMenu();
          }
        });
        closeContextMenu();
        break;
      case 'restore':
        setConfirmDialog({
          title: 'Restore Task',
          message: `Restore "${contextMenu.text}" to todo list?`,
          onConfirm: () => {
            setTasks(tasks.map(t =>
              t.id === contextMenu.id
                ? { ...t, status: 'todo', completedAt: null }
                : t
            ));
            setConfirmDialog(null);
            closeContextMenu();
          }
        });
        closeContextMenu();
        break;
      case 'delete':
        setConfirmDialog({
          title: 'Delete Task',
          message: 'Delete this task? This cannot be undone.',
          onConfirm: () => {
            setTasks(tasks.filter(t => t.id !== contextMenu.id));
            setConfirmDialog(null);
            closeContextMenu();
          }
        });
        closeContextMenu();
        break;
      case 'removeReaction':
        setTasks(tasks.map(t =>
          t.id === contextMenu.id ? { ...t, reaction: null } : t
        ));
        break;
      default:
        break;
    }
    closeContextMenu();
  };

  // Select reaction
  const selectReaction = (emoji, taskId) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, reaction: emoji } : t
    ));
    setEmojiPickerTaskId(null);
  };


  // Edit task handlers
  const handleSaveEditTask = () => {
    if (editingTaskText.trim() && editingTaskId !== null) {
      setTasks(tasks.map(task =>
        task.id === editingTaskId
          ? { ...task, text: editingTaskText.trim() }
          : task
      ));
    }
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  // Archive click handler (restore archived task)
  const handleArchiveTaskClick = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setConfirmDialog({
      title: 'Restore Task',
      message: `Restore "${task.text}" to todo list?`,
      onConfirm: () => {
        setTasks(tasks.map(t =>
          t.id === taskId
            ? { ...t, status: 'todo', completedAt: null }
            : t
        ));
        setConfirmDialog(null);
      }
    });
  };

  // Archive context menu handler
  const handleArchiveContextMenu = (e, taskId) => {
    e.preventDefault();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setContextMenu(task);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Important Stuff handlers
  const handleAddImportantCard = () => {
    if (newCardTitle.trim() && newCardContent.trim()) {
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
      ];
      const newCard = {
        id: Date.now(),
        title: newCardTitle.trim(),
        content: newCardContent.trim(),
        createdAt: new Date().toISOString(),
        color: gradients[Math.floor(Math.random() * gradients.length)]
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

  // Card edit handlers
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
    }
    setEditingCardId(null);
    setEditingCardTitle('');
    setEditingCardContent('');
    setViewingCard(null);
  };

  const handleCancelEditCard = () => {
    setEditingCardId(null);
    setEditingCardTitle('');
    setEditingCardContent('');
  };

  // Move all done tasks to archive
  const handleMoveAllDoneToArchive = () => {
    const doneTasks = tasks.filter(t => t.status === 'done');
    if (doneTasks.length === 0) return;

    setConfirmDialog({
      title: 'Archive All Done Tasks',
      message: `Move ${doneTasks.length} done task${doneTasks.length > 1 ? 's' : ''} to archive?`,
      onConfirm: () => {
        setTasks(tasks.map(t =>
          t.status === 'done'
            ? { ...t, status: 'archived', completedAt: new Date().toISOString() }
            : t
        ));
        setConfirmDialog(null);
      }
    });
  };

  // Handle All counter click - show bulk action dialog
  const handleAllCounterClick = () => {
    const activeTasks = tasks.filter(t => t.status !== 'archived').length;
    if (activeTasks === 0) return;

    setBulkActionDialog({
      mode: null, // 'archive' or 'delete' - set when user clicks button
      activeTaskCount: activeTasks
    });
    setBulkConfirmInput('');
    setDeleteArchiveCheckbox(false);
  };

  // Handle archive all active tasks
  const handleArchiveAll = () => {
    setBulkActionDialog({ ...bulkActionDialog, mode: 'archive' });
    setBulkConfirmInput('');
  };

  // Handle delete all tasks
  const handleDeleteAll = () => {
    setBulkActionDialog({ ...bulkActionDialog, mode: 'delete' });
    setBulkConfirmInput('');
  };

  // Confirm bulk archive
  const confirmBulkArchive = () => {
    if (bulkConfirmInput.toLowerCase() !== 'archive') return;

    setTasks(tasks.map(t =>
      t.status !== 'archived'
        ? { ...t, status: 'archived', completedAt: new Date().toISOString() }
        : t
    ));
    setBulkActionDialog(null);
    setBulkConfirmInput('');
  };

  // Confirm bulk delete
  const confirmBulkDelete = () => {
    if (bulkConfirmInput.toLowerCase() !== 'delete') return;

    if (deleteArchiveCheckbox) {
      // Delete all tasks including archived
      setTasks([]);
    } else {
      // Delete only active tasks, keep archived
      setTasks(tasks.filter(t => t.status === 'archived'));
    }
    setBulkActionDialog(null);
    setBulkConfirmInput('');
    setDeleteArchiveCheckbox(false);
  };

  // Handle archive checkbox click
  const handleDeleteArchiveCheckbox = () => {
    const archivedCount = tasks.filter(t => t.status === 'archived').length;
    if (archivedCount === 0) {
      setDeleteArchiveCheckbox(!deleteArchiveCheckbox);
      return;
    }

    // Show confirmation dialog with higher z-index
    setArchiveDeleteConfirmDialog({
      title: 'Delete All Archive Data',
      message: `Are you sure you want to delete ${archivedCount} archived task${archivedCount > 1 ? 's' : ''} too? This cannot be undone.`,
      onConfirm: () => {
        setDeleteArchiveCheckbox(true);
        setArchiveDeleteConfirmDialog(null);
      }
    });
  };

  // Close bulk action dialog
  const closeBulkActionDialog = () => {
    setBulkActionDialog(null);
    setBulkConfirmInput('');
    setDeleteArchiveCheckbox(false);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenu]);

  return (
    <div className={`App ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Dark Mode Toggle */}
      <div className="dark-mode-toggle">
        <button onClick={toggleDarkMode} className="mode-toggle-btn">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Important Stuff Button */}
      <div className="important-stuff-toggle">
        <button onClick={() => setShowImportantStuff(true)} className="important-stuff-btn" title="Important Stuff">
          <Pin size={20} />
        </button>
      </div>

      {/* Archive Toggle */}
      <div className="archive-toggle">
        <button onClick={() => setShowArchive(true)} className="archive-btn" title="Archive">
          <Archive size={20} />
        </button>
      </div>

      {/* Task Counter */}
      <div className="task-counter">
        <div className="counter-item">
          <span className="counter-dot todo-dot"></span>
          <span className="counter-label">Todo</span>
          <span className="counter-number">{tasks.filter(t => t.status === 'todo').length}</span>
        </div>
        <div className="counter-item">
          <span className="counter-dot progress-dot"></span>
          <span className="counter-label">On it</span>
          <span className="counter-number">{tasks.filter(t => t.status === 'in-progress').length}</span>
        </div>
        <div
          className={`counter-item ${tasks.filter(t => t.status === 'done').length > 0 ? 'clickable' : ''}`}
          onClick={tasks.filter(t => t.status === 'done').length > 0 ? handleMoveAllDoneToArchive : undefined}
          title={tasks.filter(t => t.status === 'done').length > 0 ? 'Click to archive all done tasks' : ''}
        >
          <span className="counter-dot done-dot"></span>
          <span className="counter-label">Done</span>
          <span className="counter-number">{tasks.filter(t => t.status === 'done').length}</span>
        </div>
        <div
          className={`counter-item all-counter ${tasks.filter(t => t.status !== 'archived').length > 0 ? 'clickable' : ''}`}
          onClick={tasks.filter(t => t.status !== 'archived').length > 0 ? handleAllCounterClick : undefined}
          title={tasks.filter(t => t.status !== 'archived').length > 0 ? 'Click for bulk actions' : ''}
        >
          <span className="counter-dot all-dot"></span>
          <span className="counter-label">All</span>
          <span className="counter-number">{tasks.filter(t => t.status !== 'archived').length}</span>
        </div>
      </div>

      {/* Task List */}
      <div className="task-list-container">
        <div className="task-list"
          onMouseMove={handleSwipeMove}
          onMouseUp={() => handleSwipeEnd(swipeTaskId)}
          onMouseLeave={() => handleSwipeEnd(swipeTaskId)}
          onTouchMove={handleSwipeMove}
          onTouchEnd={() => handleSwipeEnd(swipeTaskId)}
        >
          {tasks
            .filter(task => task.status !== 'archived')
            .sort((a, b) => a.createdAt - b.createdAt)
            .map(task => (
              <div
                key={task.id}
                ref={el => taskRefs.current[task.id] = el}
                className={`task-item status-${task.status || 'todo'} ${editingTaskId === task.id ? 'editing' : ''}`}
                style={
                  swipeTaskId === task.id
                    ? { transform: `translateX(${swipeOffset}px)` }
                    : {}
                }
                onContextMenu={(e) => handleContextMenu(e, task.id)}
              >
                {editingTaskId === task.id ? (
                  // Edit mode
                  <div className="edit-task-form" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      className="edit-task-input"
                      value={editingTaskText}
                      onChange={(e) => setEditingTaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditTask();
                        if (e.key === 'Escape') handleCancelEditTask();
                      }}
                      autoFocus
                    />
                    <div className="edit-task-actions">
                      <button
                        className="save-edit-btn"
                        onClick={(e) => { e.stopPropagation(); handleSaveEditTask(); }}
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        className="cancel-edit-btn"
                        onClick={(e) => { e.stopPropagation(); handleCancelEditTask(); }}
                        title="Cancel"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal view
                  <>
                    <div className="task-content-wrapper">
                      {/* Emoji/reaction display */}
                      {task.reaction && (
                        <span className="task-emoji">
                          {task.reaction}
                        </span>
                      )}
                      <span className="task-text">{task.text}</span>
                    </div>

                    {/* Status indicator */}
                    <div className="task-actions">
                      <span className="status-indicator">
                        {task.status === 'in-progress' ? 'on it' : task.status === 'done' ? 'done' : task.status === 'todo' ? 'todo' : ''}
                      </span>
                    </div>

                    {/* Swipe overlay for interaction */}
                    <div
                      className="task-touch-layer"
                      onMouseDown={(e) => handleSwipeStart(e, task.id)}
                      onTouchStart={(e) => handleSwipeStart(e, task.id)}
                      onClick={(e) => handleTaskInteract(e, task.id)}
                    />
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Input */}
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

      {/* WhatsApp-style Emoji Picker (appears below task) */}
      {emojiPickerTaskId && (
        <div className="emoji-picker-overlay" onClick={() => setEmojiPickerTaskId(null)}>
          <div
            className="emoji-picker-sheet"
            style={{
              position: 'fixed',
              top: `${emojiPickerPosition.top}px`,
              left: `${emojiPickerPosition.left}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="emoji-picker-grid">
              {REACTION_EMOJIS.map(emoji => (
                <div
                  key={emoji}
                  className="emoji-picker-item"
                  onClick={() => selectReaction(emoji, emojiPickerTaskId)}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div className="context-menu-overlay" onClick={closeContextMenu}>
          <div
            className="context-menu"
            style={{
              position: 'fixed',
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Archive-specific options */}
            {contextMenu.status === 'archived' ? (
              <>
                {/* Restore */}
                <div className="context-menu-item" onClick={() => handleContextAction('restore')}>
                  <span>↺</span>
                  <span>Restore to Todo</span>
                </div>

                <div className="context-menu-divider"></div>

                {/* Delete */}
                <div className="context-menu-item danger" onClick={() => handleContextAction('delete')}>
                  <span>🗑️</span>
                  <span>Delete</span>
                </div>
              </>
            ) : (
              <>
                {/* Edit */}
                <div className="context-menu-item" onClick={() => handleContextAction('edit')}>
                  <span>✏️</span>
                  <span>Edit</span>
                </div>

                {/* Move to Todo */}
                {contextMenu.status !== 'todo' && (
                  <div className="context-menu-item" onClick={() => handleContextAction('moveTodo')}>
                    <span>📋</span>
                    <span>Move to Todo</span>
                  </div>
                )}

                {/* Move to In Progress */}
                {contextMenu.status !== 'in-progress' && contextMenu.status !== 'done' && contextMenu.status !== 'archived' && (
                  <div className="context-menu-item" onClick={() => handleContextAction('moveInProgress')}>
                    <span>▶️</span>
                    <span>Move to In Progress</span>
                  </div>
                )}

                {/* Move to Done */}
                {contextMenu.status !== 'done' && contextMenu.status !== 'archived' && contextMenu.status !== 'todo' && (
                  <div className="context-menu-item" onClick={() => handleContextAction('moveDone')}>
                    <span>✅</span>
                    <span>Move to Done</span>
                  </div>
                )}

                {/* Move to Archive - only show for done tasks */}
                {contextMenu.status === 'done' && (
                  <div className="context-menu-item" onClick={() => handleContextAction('moveArchive')}>
                    <span>📦</span>
                    <span>Move to Archive</span>
                  </div>
                )}

                {/* Remove Reaction */}
                {contextMenu.reaction && (
                  <div className="context-menu-item" onClick={() => handleContextAction('removeReaction')}>
                    <span>❌</span>
                    <span>Remove Reaction</span>
                  </div>
                )}

                <div className="context-menu-divider"></div>

                {/* Delete */}
                <div className="context-menu-item danger" onClick={() => handleContextAction('delete')}>
                  <span>🗑️</span>
                  <span>Delete</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="confirm-dialog-overlay" onClick={() => setConfirmDialog(null)}>
          <div
            className="confirm-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="confirm-dialog-title">{confirmDialog.title}</h3>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                className="confirm-dialog-btn cancel"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                className="confirm-dialog-btn confirm"
                onClick={confirmDialog.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Delete Confirmation Dialog (Higher z-index) */}
      {archiveDeleteConfirmDialog && (
        <div className="confirm-dialog-overlay top-level" onClick={() => setArchiveDeleteConfirmDialog(null)}>
          <div
            className="confirm-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="confirm-dialog-title">{archiveDeleteConfirmDialog.title}</h3>
            <p className="confirm-dialog-message">{archiveDeleteConfirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                className="confirm-dialog-btn cancel"
                onClick={() => setArchiveDeleteConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                className="confirm-dialog-btn confirm"
                onClick={archiveDeleteConfirmDialog.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Important Stuff Popup */}
      {showImportantStuff && (
        <div className="popup-overlay" onClick={() => setShowImportantStuff(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h2 className="popup-title">📌 Important Stuff</h2>
              <button className="close-popup-btn" onClick={() => setShowImportantStuff(false)}>×</button>
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
                        <span className="card-date">{new Date(card.createdAt).toLocaleDateString()}</span>
                        <div className="card-actions">
                          <button
                            className="card-edit-btn"
                            onClick={(e) => { e.stopPropagation(); handleStartEditCard(card); }}
                            title="Edit card"
                          >✏️</button>
                          <button
                            className="card-delete-btn"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                            title="Delete card"
                          >🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="add-card-btn" onClick={() => setShowAddCard(true)}>
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
              <button className="close-popup-btn" onClick={() => setShowAddCard(false)}>×</button>
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
                  onClick={() => { setShowAddCard(false); setNewCardTitle(''); setNewCardContent(''); }}
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
        <div className="popup-overlay" onClick={() => { if (editingCardId === null) setViewingCard(null); }}>
          <div className="popup-content view-card-content" onClick={e => e.stopPropagation()}>
            {editingCardId === viewingCard.id ? (
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
                    <button className="save-edit-card-btn" onClick={handleSaveEditCard} title="Save">✓</button>
                    <button className="cancel-edit-card-btn" onClick={handleCancelEditCard} title="Cancel">×</button>
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
              <>
                <div className="view-card-header" style={{ background: viewingCard.color }}>
                  <h2 className="view-card-title">{viewingCard.title}</h2>
                  <div className="view-card-actions">
                    <button className="view-card-edit-btn" onClick={() => handleStartEditCard(viewingCard)} title="Edit card">✏️</button>
                    <button className="view-card-delete-btn" onClick={() => handleDeleteCard(viewingCard.id)} title="Delete card">🗑️</button>
                    <button className="close-popup-btn" onClick={() => setViewingCard(null)}>×</button>
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

      {/* Archive Popup */}
      {showArchive && (
        <div className="popup-overlay" onClick={() => setShowArchive(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h2 className="popup-title">📦 Archive</h2>
              <button className="close-popup-btn" onClick={() => setShowArchive(false)}>×</button>
            </div>
            <div className="popup-body">
              {tasks.filter(task => task.status === 'archived').length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <p>No archived tasks yet</p>
                </div>
              ) : (
                <div className="archive-list">
                  {tasks
                    .filter(task => task.status === 'archived')
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    .map(task => (
                      <div
                        key={task.id}
                        className="archive-item"
                        onContextMenu={(e) => handleArchiveContextMenu(e, task.id)}
                      >
                        <div className="archive-item-content">
                          {task.reaction && (
                            <span className="archive-emoji">{task.reaction}</span>
                          )}
                          <span className="archive-task-text">{task.text}</span>
                        </div>
                        <span className="archive-date">
                          {task.completedAt && new Date(task.completedAt).toLocaleDateString()}
                        </span>
                        <button
                          className="archive-restore-btn"
                          onClick={(e) => { e.stopPropagation(); handleArchiveTaskClick(task.id); }}
                          title="Restore to todo"
                        >
                          ↺
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Dialog */}
      {bulkActionDialog && !bulkActionDialog.mode && (
        <div className="confirm-dialog-overlay" onClick={closeBulkActionDialog}>
          <div
            className="confirm-dialog bulk-action-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="confirm-dialog-title">Bulk Actions</h3>
            <p className="confirm-dialog-message">
              You have {bulkActionDialog.activeTaskCount} active task{bulkActionDialog.activeTaskCount > 1 ? 's' : ''}. What would you like to do?
            </p>
            <div className="bulk-action-buttons">
              <button
                className="bulk-action-btn archive-btn"
                onClick={handleArchiveAll}
              >
                📦 Archive All
              </button>
              <button
                className="bulk-action-btn delete-btn"
                onClick={handleDeleteAll}
              >
                🗑️ Delete All
              </button>
            </div>
            <button
              className="bulk-action-cancel-btn"
              onClick={closeBulkActionDialog}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Archive Confirmation */}
      {bulkActionDialog && bulkActionDialog.mode === 'archive' && (
        <div className="confirm-dialog-overlay" onClick={closeBulkActionDialog}>
          <div
            className="confirm-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="confirm-dialog-title">Archive All Tasks</h3>
            <p className="confirm-dialog-message">
              This will archive {bulkActionDialog.activeTaskCount} task{bulkActionDialog.activeTaskCount > 1 ? 's' : ''}.<br /><br />
              Type <strong>"archive"</strong> to confirm:
            </p>
            <input
              type="text"
              className="bulk-confirm-input"
              value={bulkConfirmInput}
              onChange={(e) => setBulkConfirmInput(e.target.value)}
              placeholder="Type 'archive' here"
              autoFocus
            />
            <div className="confirm-dialog-actions">
              <button
                className="confirm-dialog-btn cancel"
                onClick={closeBulkActionDialog}
              >
                Cancel
              </button>
              <button
                className="confirm-dialog-btn confirm"
                onClick={confirmBulkArchive}
                disabled={bulkConfirmInput.toLowerCase() !== 'archive'}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {bulkActionDialog && bulkActionDialog.mode === 'delete' && (
        <div className="confirm-dialog-overlay" onClick={closeBulkActionDialog}>
          <div
            className="confirm-dialog bulk-delete-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="confirm-dialog-title">Delete All Tasks</h3>
            <p className="confirm-dialog-message">
              This will delete {bulkActionDialog.activeTaskCount} task{bulkActionDialog.activeTaskCount > 1 ? 's' : ''}.<br /><br />
              Type <strong>"delete"</strong> to confirm:
            </p>
            <input
              type="text"
              className="bulk-confirm-input"
              value={bulkConfirmInput}
              onChange={(e) => setBulkConfirmInput(e.target.value)}
              placeholder="Type 'delete' here"
              autoFocus
            />
            <div className="delete-archive-checkbox-container">
              <label className="delete-archive-checkbox-label">
                <input
                  type="checkbox"
                  checked={deleteArchiveCheckbox}
                  onChange={(e) => {
                    if (e.target.checked && !deleteArchiveCheckbox) {
                      handleDeleteArchiveCheckbox();
                    } else {
                      setDeleteArchiveCheckbox(e.target.checked);
                    }
                  }}
                  className="delete-archive-checkbox"
                />
                <span>Also delete {tasks.filter(t => t.status === 'archived').length} archived task{tasks.filter(t => t.status === 'archived').length !== 1 ? 's' : ''}</span>
              </label>
            </div>
            <div className="confirm-dialog-actions">
              <button
                className="confirm-dialog-btn cancel"
                onClick={closeBulkActionDialog}
              >
                Cancel
              </button>
              <button
                className="confirm-dialog-btn confirm danger"
                onClick={confirmBulkDelete}
                disabled={bulkConfirmInput.toLowerCase() !== 'delete'}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
