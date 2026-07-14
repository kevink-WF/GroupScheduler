import { useEffect, useMemo, useState } from 'react';

const groupCode = '123456';
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const workdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const storageKeys = {
  users: 'group-scheduler-users',
  activeUserId: 'group-scheduler-active-user-id',
  userSettings: 'group-scheduler-user-settings',
  globalSettings: 'group-scheduler-global-settings',
};

const defaultUserSettings = {
  mode: '',
  workingDays: {
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  },
  hoursByDay: {
    0: { start: '', end: '' },
    1: { start: '', end: '' },
    2: { start: '', end: '' },
    3: { start: '', end: '' },
    4: { start: '', end: '' },
    5: { start: '', end: '' },
    6: { start: '', end: '' },
  },
};

const defaultGlobalSettings = {
  busyColor: '#5b7cff',
  visibleStartHour: 12,
  visibleEndHour: 24,
};

const exampleUsers = [
  { id: 'user-1', name: 'John Smith' },
  { id: 'user-2', name: 'Anna Juarez' },
  { id: 'user-3', name: 'Inga Vasily' },
  { id: 'user-4', name: 'Dmitri Petrov' },
  { id: 'user-5', name: 'Marie Elise' },
  { id: 'user-6', name: 'Tanya Lopes' },
];

function createExampleUsers() {
  return exampleUsers.map((user) => ({ ...user }));
}

function createExampleUserSettingsMap() {
  return {
    'user-1': {
      mode: 'busy',
      workingDays: {
        0: false,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: false,
      },
      hoursByDay: createDefaultUserSettings().hoursByDay,
    },
    'user-2': {
      mode: 'hours',
      workingDays: { ...defaultUserSettings.workingDays },
      hoursByDay: {
        0: { start: '', end: '' },
        1: { start: '9:00 AM', end: '5:00 PM' },
        2: { start: '9:00 AM', end: '5:00 PM' },
        3: { start: '9:00 AM', end: '5:00 PM' },
        4: { start: '9:00 AM', end: '5:00 PM' },
        5: { start: '10:00 AM', end: '2:00 PM' },
        6: { start: '', end: '' },
      },
    },
    'user-3': {
      mode: 'busy',
      workingDays: {
        0: false,
        1: false,
        2: true,
        3: false,
        4: true,
        5: false,
        6: true,
      },
      hoursByDay: createDefaultUserSettings().hoursByDay,
    },
    'user-4': {
      mode: 'hours',
      workingDays: { ...defaultUserSettings.workingDays },
      hoursByDay: {
        0: { start: '', end: '' },
        1: { start: '11:00 AM', end: '7:00 PM' },
        2: { start: '', end: '' },
        3: { start: '11:00 AM', end: '7:00 PM' },
        4: { start: '', end: '' },
        5: { start: '11:00 AM', end: '7:00 PM' },
        6: { start: '', end: '' },
      },
    },
    'user-5': {
      mode: 'busy',
      workingDays: {
        0: true,
        1: false,
        2: true,
        3: false,
        4: true,
        5: false,
        6: false,
      },
      hoursByDay: createDefaultUserSettings().hoursByDay,
    },
    'user-6': {
      mode: 'hours',
      workingDays: { ...defaultUserSettings.workingDays },
      hoursByDay: {
        0: { start: '', end: '' },
        1: { start: '1:00 PM', end: '10:00 PM' },
        2: { start: '1:00 PM', end: '10:00 PM' },
        3: { start: '1:00 PM', end: '10:00 PM' },
        4: { start: '1:00 PM', end: '10:00 PM' },
        5: { start: '2:00 PM', end: '8:00 PM' },
        6: { start: '12:00 PM', end: '6:00 PM' },
      },
    },
  };
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function dateKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function keyToDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDayLabel(key) {
  return keyToDate(key).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatHourLabel(hour) {
  const nextHour = (hour + 1) % 24;
  const formatPart = (value) => {
    const period = value >= 12 ? 'PM' : 'AM';
    const normalized = value % 12 || 12;
    return `${normalized} ${period}`;
  };

  return `${formatPart(hour)} - ${formatPart(nextHour)}`;
}

// Accepts flexible clock text like "12:00pm", "9am", "9:30 PM", or plain 24-hour
// values like "14:00" (no am/pm suffix is read literally, so old-style values
// still work). Returns minutes-since-midnight, or null if it can't be parsed.
function parseTimeToMinutes(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3] ? match[3].toLowerCase() : null;

  if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  } else if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }

  if (hour < 0 || hour > 24 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

// Renders minutes-since-midnight back into a tidy "h:mm AM/PM" string, so
// whatever a person types gets cleaned up into something consistent and
// easy to copy elsewhere.
function formatMinutesAsClock(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || Number.isNaN(totalMinutes)) {
    return '';
  }

  const safeMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${pad(minute)} ${period}`;
}

function createEventMap(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  return new Map([
    [dateKey(year, month, 2), 'busy'],
    [dateKey(year, month, 7), 'busy'],
    [dateKey(year, month, 11), 'busy'],
    [dateKey(year, month, referenceDate.getDate()), 'today'],
    [dateKey(year, month, 18), 'busy'],
    [dateKey(year, month, 23), 'busy'],
    [dateKey(year, month, 28), 'busy'],
  ]);
}

function createDefaultUserSettings() {
  return {
    mode: '',
    workingDays: { ...defaultUserSettings.workingDays },
    hoursByDay: {
      0: { ...defaultUserSettings.hoursByDay[0] },
      1: { ...defaultUserSettings.hoursByDay[1] },
      2: { ...defaultUserSettings.hoursByDay[2] },
      3: { ...defaultUserSettings.hoursByDay[3] },
      4: { ...defaultUserSettings.hoursByDay[4] },
      5: { ...defaultUserSettings.hoursByDay[5] },
      6: { ...defaultUserSettings.hoursByDay[6] },
    },
  };
}

function normalizeUserSettings(value) {
  if (!value || typeof value !== 'object') {
    return createDefaultUserSettings();
  }

  return {
    mode: value.mode === 'busy' || value.mode === 'hours' ? value.mode : '',
    workingDays: { ...defaultUserSettings.workingDays, ...(value.workingDays || {}) },
    hoursByDay: { ...createDefaultUserSettings().hoursByDay, ...(value.hoursByDay || {}) },
  };
}

function normalizeUserSettingsMap(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [userId, settings]) => {
    accumulator[userId] = normalizeUserSettings(settings);
    return accumulator;
  }, {});
}

function normalizeGlobalSettings(value) {
  if (!value || typeof value !== 'object') {
    return defaultGlobalSettings;
  }

  return {
    busyColor: typeof value.busyColor === 'string' ? value.busyColor : defaultGlobalSettings.busyColor,
    visibleStartHour:
      Number.isInteger(value.visibleStartHour) && value.visibleStartHour >= 0 && value.visibleStartHour < 24
        ? value.visibleStartHour
        : defaultGlobalSettings.visibleStartHour,
    visibleEndHour:
      Number.isInteger(value.visibleEndHour) && value.visibleEndHour > 0 && value.visibleEndHour <= 24
        ? value.visibleEndHour
        : defaultGlobalSettings.visibleEndHour,
  };
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');

  if (normalized.length !== 6) {
    return null;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
    return null;
  }

  return { red, green, blue };
}

function withAlpha(hex, alpha) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return `rgba(91, 124, 255, ${alpha})`;
  }

  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
}

function readStoredValue(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function buildCalendarCells(year, month, today, eventMap, onSelectDay) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const startingOffset = firstDay.getDay();
  const currentMonthDate = new Date(year, month, 1);
  const cells = [];

  for (let index = 0; index < startingOffset; index += 1) {
    cells.push(<div key={`empty-${index}`} className="calendar-cell empty" aria-hidden="true" />);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const key = dateKey(year, month, day);
    const status = eventMap.get(key) || '';
    const classes = ['calendar-cell', 'calendar-cell-button'];

    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
      classes.push('today');
    }

    if (status === 'busy') {
      classes.push('busy');
    }

    cells.push(
      <button
        key={key}
        type="button"
        className={classes.join(' ')}
        role="gridcell"
        aria-label={`${monthFormatter.format(currentMonthDate)} ${day}${status === 'busy' ? ', scheduled' : ''}`}
        onClick={() => onSelectDay(key)}
      >
        <div className="day-number">{day}</div>
        <span className="day-chip">Open</span>
      </button>,
    );
  }

  return { cells, totalDays, currentMonthDate };
}

function buildDayTimeline(users, selectedDate, userSettingsById, visibleStartHour, visibleEndHour) {
  const weekdayIndex = selectedDate.getDay();

  return Array.from({ length: Math.max(visibleEndHour - visibleStartHour, 0) }, (_, index) => {
    const hour = visibleStartHour + index;

    return {
    hour,
    cells: users.map((user) => {
      const settings = normalizeUserSettings(userSettingsById[user.id]);
      let state = 'empty';

      if (settings.mode === 'busy') {
        state = settings.workingDays[weekdayIndex] ? 'busy' : 'empty';
      } else if (settings.mode === 'hours') {
        const range = settings.hoursByDay[weekdayIndex];
        const startMinutes = parseTimeToMinutes(range?.start);
        const endMinutes = parseTimeToMinutes(range?.end);

        if (startMinutes !== null && endMinutes !== null) {
          const hourMinutes = hour * 60;

          if (hourMinutes >= startMinutes && hourMinutes < endMinutes) {
            state = 'working';
          }
        }
      }

      return {
        user,
        state,
      };
    }),
    };
  });
}

function buildDayBlocks(users, selectedDate, userSettingsById, visibleStartHour, visibleEndHour) {
  const weekdayIndex = selectedDate.getDay();

  return users.map((user, index) => {
    const settings = normalizeUserSettings(userSettingsById[user.id]);
    const laneColor = withAlpha(globalLaneColors[index % globalLaneColors.length], 0.92);
    const laneColorSoft = withAlpha(globalLaneColors[index % globalLaneColors.length], 0.68);

    if (settings.mode === 'busy') {
      if (!settings.workingDays[weekdayIndex]) {
        return { user, index, blocks: [], laneColor, laneColorSoft };
      }

      return {
        user,
        index,
        laneColor,
        laneColorSoft,
        blocks: [
          {
            state: 'busy',
            start: visibleStartHour,
            end: visibleEndHour,
          },
        ],
      };
    }

    if (settings.mode === 'hours') {
      const range = settings.hoursByDay[weekdayIndex];
      const startMinutes = parseTimeToMinutes(range?.start);
      const endMinutes = parseTimeToMinutes(range?.end);

      if (startMinutes === null || endMinutes === null) {
        return { user, index, blocks: [], laneColor, laneColorSoft };
      }

      const startHour = startMinutes / 60;
      const endHour = endMinutes / 60;
      const blockStart = Math.max(startHour, visibleStartHour);
      const blockEnd = Math.min(endHour, visibleEndHour);

      if (blockEnd <= blockStart) {
        return { user, index, blocks: [], laneColor, laneColorSoft };
      }

      return {
        user,
        index,
        laneColor,
        laneColorSoft,
        blocks: [
          {
            state: 'working',
            start: blockStart,
            end: blockEnd,
          },
        ],
      };
    }

    return {
      user,
      index,
      laneColor,
      laneColorSoft,
      blocks: [],
    };
  });
}

function createEmptyDayDetails() {
  return {
    note: '',
    userId: '',
  };
}

function createDefaultGlobalModeLabel(value) {
  return value === 'busy' ? 'Busy days' : value === 'hours' ? 'Working hours' : 'Not configured';
}

const globalLaneColors = ['#5b7cff', '#f97316', '#10b981', '#e879f9', '#22c55e', '#14b8a6', '#f59e0b', '#ef4444'];

export default function App() {
  const [today] = useState(() => new Date());
  const [enteredCode, setEnteredCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [users, setUsers] = useState(() => {
    const storedUsers = readStoredValue(storageKeys.users, []);
    return storedUsers.length ? storedUsers : createExampleUsers();
  });
  const [activeUserId, setActiveUserId] = useState(() => {
    const storedActiveUserId = readStoredValue(storageKeys.activeUserId, '');

    if (storedActiveUserId) {
      return storedActiveUserId;
    }

    const storedUsers = readStoredValue(storageKeys.users, []);
    return (storedUsers.length ? storedUsers : exampleUsers)[0]?.id || '';
  });
  const [userSettingsById, setUserSettingsById] = useState(() => {
    const storedSettings = normalizeUserSettingsMap(readStoredValue(storageKeys.userSettings, {}));
    return Object.keys(storedSettings).length ? storedSettings : createExampleUserSettingsMap();
  });
  const [globalSettings, setGlobalSettings] = useState(() => normalizeGlobalSettings(readStoredValue(storageKeys.globalSettings, null)));
  const [dayDetailsByDate, setDayDetailsByDate] = useState(() => readStoredValue('group-scheduler-day-details', {}));
  const [selectedDayKey, setSelectedDayKey] = useState(() => dateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  const [viewState, setViewState] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [newUserName, setNewUserName] = useState('');
  const [settingsUserId, setSettingsUserId] = useState(() => activeUserId || '');

  const eventMap = useMemo(() => createEventMap(today), [today]);
  const selectedDayDate = useMemo(() => keyToDate(selectedDayKey), [selectedDayKey]);
  const activeUser = users.find((user) => user.id === activeUserId) || users[0] || null;
  const settingsUser = activeUser;
  const selectedDayDetails = dayDetailsByDate[selectedDayKey] || createEmptyDayDetails();
  const dayBlocks = useMemo(
    () => buildDayBlocks(users, selectedDayDate, userSettingsById, globalSettings.visibleStartHour, globalSettings.visibleEndHour),
    [globalSettings.visibleEndHour, globalSettings.visibleStartHour, selectedDayDate, userSettingsById, users],
  );
  const dayTimeline = useMemo(
    () =>
      buildDayTimeline(
        users,
        selectedDayDate,
        userSettingsById,
        globalSettings.visibleStartHour,
        globalSettings.visibleEndHour,
      ),
    [globalSettings.visibleEndHour, globalSettings.visibleStartHour, selectedDayDate, userSettingsById, users],
  );

  const { cells, totalDays, currentMonthDate } = useMemo(
    () => buildCalendarCells(viewState.year, viewState.month, today, eventMap, handleDayOpen),
    [eventMap, today, viewState.month, viewState.year],
  );

  const monthName = monthFormatter.format(currentMonthDate);
  const shellStyle = { '--busy': globalSettings.busyColor };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKeys.users, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKeys.activeUserId, JSON.stringify(activeUserId));
  }, [activeUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKeys.userSettings, JSON.stringify(userSettingsById));
  }, [userSettingsById]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKeys.globalSettings, JSON.stringify(globalSettings));
  }, [globalSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('group-scheduler-day-details', JSON.stringify(dayDetailsByDate));
  }, [dayDetailsByDate]);

  useEffect(() => {
    if (!users.length) {
      return;
    }

    if (!activeUserId || !users.some((user) => user.id === activeUserId)) {
      setActiveUserId(users[0].id);
    }
  }, [activeUserId, users]);

  useEffect(() => {
    if (!settingsUserId && activeUserId) {
      setSettingsUserId(activeUserId);
    }
  }, [activeUserId, settingsUserId]);

  useEffect(() => {
    setUserSettingsById((current) => {
      let changed = false;
      const nextSettings = { ...current };

      users.forEach((user) => {
        if (!nextSettings[user.id]) {
          nextSettings[user.id] = createDefaultUserSettings();
          changed = true;
        }
      });

      Object.keys(nextSettings).forEach((userId) => {
        if (!users.some((user) => user.id === userId)) {
          delete nextSettings[userId];
          changed = true;
        }
      });

      return changed ? nextSettings : current;
    });
  }, [users]);

  function handleSubmit(event) {
    event.preventDefault();
    const sanitizedCode = enteredCode.replace(/\D/g, '').slice(0, 6);
    const trimmedName = displayName.trim();

    setEnteredCode(sanitizedCode);

    if (sanitizedCode !== groupCode) {
      setErrorMessage('That group code is not valid yet. Use 123456 to continue.');
      return;
    }

    if (!trimmedName) {
      setErrorMessage('Enter your display name so this app can sign you in.');
      return;
    }

    const nextActiveUser = users.find((user) => user.name.toLowerCase() === trimmedName.toLowerCase());

    if (!nextActiveUser) {
      setErrorMessage('Use Global settings to add new users in this example.');
      return;
    }

    handleSetActiveUser(nextActiveUser.id);
    setDisplayName(nextActiveUser.name);
    setErrorMessage('');
    setIsLoggedIn(true);
    setSelectedDayKey(dateKey(today.getFullYear(), today.getMonth(), today.getDate()));
    setViewMode('month');
  }

  function handleCodeChange(event) {
    const nextValue = event.target.value.replace(/\D/g, '').slice(0, 6);
    setEnteredCode(nextValue);

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  function handleAddUser(event) {
    event.preventDefault();
    const trimmedName = newUserName.trim();

    if (!trimmedName) {
      return;
    }

    if (users.some((user) => user.name.toLowerCase() === trimmedName.toLowerCase())) {
      setNewUserName('');
      return;
    }

    const nextUser = {
      id: `user-${Date.now()}`,
      name: trimmedName,
    };

    setUsers((currentUsers) => [...currentUsers, nextUser]);
    setUserSettingsById((current) => ({
      ...current,
      [nextUser.id]: createDefaultUserSettings(),
    }));
    handleSetActiveUser(nextUser.id);
    setNewUserName('');
  }

  function handleSetActiveUser(userId) {
    setActiveUserId(userId);
    setSettingsUserId(userId);
  }

  function handleRenameUser(userId, nextName) {
    const trimmedName = nextName;

    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === userId ? { ...user, name: trimmedName } : user)),
    );
  }

  function handleRemoveUser(userId) {
    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
    setUserSettingsById((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });

    if (activeUserId === userId) {
      const remainingUsers = users.filter((user) => user.id !== userId);
      handleSetActiveUser(remainingUsers[0]?.id || '');
    }

    if (settingsUserId === userId) {
      const remainingUsers = users.filter((user) => user.id !== userId);
      setSettingsUserId(remainingUsers[0]?.id || '');
    }
  }

  function handleDayOpen(key) {
    setSelectedDayKey(key);
    setViewMode('day-config');
  }

  function moveMonth(delta) {
    const nextDate = new Date(viewState.year, viewState.month + delta, 1);
    setViewState({
      year: nextDate.getFullYear(),
      month: nextDate.getMonth(),
    });
    setSelectedDayKey(dateKey(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setViewMode('month');
  }

  function updateUserSettings(userId, field, value) {
    setUserSettingsById((current) => ({
      ...current,
      [userId]: {
        ...normalizeUserSettings(current[userId]),
        [field]: value,
      },
    }));
  }

  function setUserWorkingDay(userId, dayIndex, value) {
    setUserSettingsById((current) => ({
      ...current,
      [userId]: {
        ...normalizeUserSettings(current[userId]),
        workingDays: {
          ...normalizeUserSettings(current[userId]).workingDays,
          [dayIndex]: value,
        },
      },
    }));
  }

  function updateUserWorkingHours(userId, dayIndex, field, value) {
    setUserSettingsById((current) => ({
      ...current,
      [userId]: {
        ...normalizeUserSettings(current[userId]),
        hoursByDay: {
          ...normalizeUserSettings(current[userId]).hoursByDay,
          [dayIndex]: {
            ...normalizeUserSettings(current[userId]).hoursByDay[dayIndex],
            [field]: value,
          },
        },
      },
    }));
  }

  function handleWorkingHourBlur(userId, dayIndex, field, rawValue) {
    const minutes = parseTimeToMinutes(rawValue);

    if (minutes === null) {
      return;
    }

    const tidied = formatMinutesAsClock(minutes);

    if (tidied !== rawValue) {
      updateUserWorkingHours(userId, dayIndex, field, tidied);
    }
  }

  function saveDayDetails(field, value) {
    setDayDetailsByDate((current) => ({
      ...current,
      [selectedDayKey]: {
        ...selectedDayDetails,
        [field]: value,
      },
    }));
  }

  return (
    <main className="shell" style={shellStyle}>
      {!isLoggedIn ? (
        <section className="hero-card login-panel" aria-labelledby="login-title">
          <div className="hero-copy">
            <p className="eyebrow">Group Scheduler</p>
            <h1 id="login-title">Simple planning, clearer weeks.</h1>
            <p className="lede">
              This is a frontend-only prototype for testing the group code, user signup, and the scheduling screens before the real app is built.
            </p>
            <div className="feature-row">
              <div>
                <span className="feature-label">Group code</span>
                <strong>123456</strong>
              </div>
              <div>
                <span className="feature-label">Sign in as</span>
                <strong>{displayName.trim() || 'Your name'}</strong>
              </div>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>Enter 6-digit group code</span>
              <input
                name="group-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                autoComplete="one-time-code"
                aria-describedby="login-hint login-error"
                value={enteredCode}
                onChange={handleCodeChange}
              />
            </label>

            <label className="field">
              <span>Your display name</span>
              <input
                name="display-name"
                type="text"
                placeholder="Alex"
                autoComplete="nickname"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>

            <p className="hint" id="login-hint">
              Use the temporary group code for now. Six example users are already set up, and new users are managed from Global settings.
            </p>
            <p className="error" id="login-error" role="alert" aria-live="polite">
              {errorMessage}
            </p>
            <button className="primary-button" type="submit">
              Enter scheduler
            </button>
          </form>
        </section>
      ) : viewMode === 'global-settings' ? (
        <section className="app-screen settings-screen" aria-labelledby="global-settings-title">
          <header className="topbar hero-card">
            <div>
              <p className="eyebrow">Global settings</p>
              <h2 id="global-settings-title">Theme and shared behavior</h2>
            </div>
            <div className="topbar-actions">
              <div className="status-pill">Signed in as {activeUser?.name || displayName}</div>
              <button className="nav-button settings-button" type="button" onClick={() => setViewMode('month')}>
                Back
              </button>
            </div>
          </header>

          <section className="settings-grid single-column">
            <article className="hero-card settings-panel">
              <div className="settings-copy">
                <p className="eyebrow">Busy color</p>
                <h3>Change the color used for busy days</h3>
                <p>
                  This color drives the busy state everywhere in the app, including the calendar, daily board, and user settings previews.
                </p>
              </div>

              <div className="color-picker-row">
                <label className="field compact">
                  <span>Busy day color</span>
                  <input
                    type="color"
                    value={globalSettings.busyColor}
                    onChange={(event) => setGlobalSettings((current) => ({ ...current, busyColor: event.target.value }))}
                  />
                </label>
                <div className="color-preview" style={{ background: globalSettings.busyColor }}>
                  Busy preview
                </div>
              </div>

              <div className="settings-copy">
                <p className="eyebrow">Visible hours</p>
                <p>By default the day board starts at noon and ends at midnight. Change the window whenever you want to see more or less of the day.</p>
              </div>

              <div className="hour-inputs visible-hours-grid">
                <label className="field compact">
                  <span>Show from</span>
                  <select
                    value={globalSettings.visibleStartHour}
                    onChange={(event) => {
                      const nextStartHour = Number(event.target.value);
                      setGlobalSettings((current) => ({
                        ...current,
                        visibleStartHour: nextStartHour,
                        visibleEndHour: Math.max(current.visibleEndHour, nextStartHour + 1),
                      }));
                    }}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {formatHourLabel(hour).split(' - ')[0]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field compact">
                  <span>Show until</span>
                  <select
                    value={globalSettings.visibleEndHour}
                    onChange={(event) => {
                      const nextEndHour = Number(event.target.value);
                      setGlobalSettings((current) => ({
                        ...current,
                        visibleEndHour: nextEndHour,
                        visibleStartHour: Math.min(current.visibleStartHour, nextEndHour - 1),
                      }));
                    }}
                  >
                    {Array.from({ length: 24 }, (_, hour) => hour + 1).map((hour) => (
                      <option key={hour} value={hour}>
                        {hour === 24 ? '12 AM' : formatHourLabel(hour - 1).split(' - ')[1]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="settings-actions">
                <button className="primary-button" type="button" onClick={() => setViewMode('month')}>
                  Save and return
                </button>
              </div>
            </article>

            <article className="hero-card settings-panel">
              <div className="settings-copy">
                <p className="eyebrow">Users</p>
                <h3>Manage the example people here</h3>
                <p>
                  The example starts with six configured users. Use this panel to add, remove, or mark the active user.
                </p>
              </div>

              <form className="user-manager-form" onSubmit={handleAddUser}>
                <label className="field compact">
                  <span>Add a user</span>
                  <input
                    type="text"
                    value={newUserName}
                    placeholder="New user name"
                    onChange={(event) => setNewUserName(event.target.value)}
                  />
                </label>
                <button className="primary-button" type="submit">
                  Add user
                </button>
              </form>

              <div className="user-manager-list">
                {users.map((user) => {
                  const isActive = user.id === activeUserId;

                  return (
                    <div key={user.id} className={isActive ? 'user-manager-row active' : 'user-manager-row'}>
                      <button type="button" className="user-manager-main" onClick={() => handleSetActiveUser(user.id)}>
                        <strong>{user.name}</strong>
                        <span>{isActive ? 'Active user' : 'Set as active'}</span>
                      </button>
                      <button
                        type="button"
                        className="nav-button user-remove-button"
                        onClick={() => handleRemoveUser(user.id)}
                        disabled={users.length <= 1}
                        aria-label={`Remove ${user.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        </section>
      ) : viewMode === 'user-settings' ? (
        <section className="app-screen settings-screen" aria-labelledby="user-settings-title">
          <header className="topbar hero-card">
            <div>
              <p className="eyebrow">User settings</p>
              <h2 id="user-settings-title">Configure the active user</h2>
            </div>
            <div className="topbar-actions">
              <div className="status-pill">Signed in as {activeUser?.name || displayName}</div>
              <button className="nav-button settings-button" type="button" onClick={() => setViewMode('month')}>
                Back
              </button>
            </div>
          </header>

          <section className="settings-grid single-column">
            <article className="hero-card settings-panel">
              <div className="settings-copy">
                <p className="eyebrow">Active user</p>
                <h3>{settingsUser?.name || 'No active user'}</h3>
                <p>
                  This screen only edits the active user. Add, remove, and switch users from Global settings.
                </p>
              </div>

              {settingsUser ? (
                <>
                  <div className="settings-switches">
                    <button
                      type="button"
                      className={normalizeUserSettings(userSettingsById[settingsUser.id]).mode === 'busy' ? 'choice-card active' : 'choice-card'}
                      onClick={() => updateUserSettings(settingsUser.id, 'mode', 'busy')}
                    >
                      Treat working days as fully busy
                    </button>
                    <button
                      type="button"
                      className={normalizeUserSettings(userSettingsById[settingsUser.id]).mode === 'hours' ? 'choice-card active' : 'choice-card'}
                      onClick={() => updateUserSettings(settingsUser.id, 'mode', 'hours')}
                    >
                      Give me working hours instead
                    </button>
                  </div>

                  {normalizeUserSettings(userSettingsById[settingsUser.id]).mode === 'busy' ? (
                    <div className="working-days-grid">
                      {workdayNames.map((dayName, index) => {
                        const dayIndex = (index + 1) % 7;
                        const isWorking = normalizeUserSettings(userSettingsById[settingsUser.id]).workingDays[dayIndex];

                        return (
                          <div key={dayName} className="working-day-row">
                            <strong>{dayName}</strong>
                            <div className="toggle-group">
                              <button
                                type="button"
                                className={isWorking ? 'toggle-button active' : 'toggle-button'}
                                onClick={() => setUserWorkingDay(settingsUser.id, dayIndex, true)}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                className={!isWorking ? 'toggle-button active' : 'toggle-button'}
                                onClick={() => setUserWorkingDay(settingsUser.id, dayIndex, false)}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {normalizeUserSettings(userSettingsById[settingsUser.id]).mode === 'hours' ? (
                    <>
                      <p className="compact-hint hours-format-hint">
                        Type times however is easiest to paste — <span>12:00pm</span>, <span>9am</span>, or{' '}
                        <span>14:00</span> all work. They'll be tidied up automatically once you click away.
                      </p>
                      <div className="hours-grid">
                        {weekdayNames.map((dayName, dayIndex) => {
                          const settings = normalizeUserSettings(userSettingsById[settingsUser.id]);

                          return (
                            <div key={dayName} className="hour-row-card">
                              <strong>{dayName}</strong>
                              <div className="hour-inputs">
                                <label className="field compact">
                                  <span>Start</span>
                                  <input
                                    type="text"
                                    inputMode="text"
                                    placeholder="12:00pm"
                                    value={settings.hoursByDay[dayIndex].start}
                                    onChange={(event) => updateUserWorkingHours(settingsUser.id, dayIndex, 'start', event.target.value)}
                                    onBlur={(event) => handleWorkingHourBlur(settingsUser.id, dayIndex, 'start', event.target.value)}
                                  />
                                </label>
                                <label className="field compact">
                                  <span>End</span>
                                  <input
                                    type="text"
                                    inputMode="text"
                                    placeholder="5:00pm"
                                    value={settings.hoursByDay[dayIndex].end}
                                    onChange={(event) => updateUserWorkingHours(settingsUser.id, dayIndex, 'end', event.target.value)}
                                    onBlur={(event) => handleWorkingHourBlur(settingsUser.id, dayIndex, 'end', event.target.value)}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <p className="hint">Set an active user from Global settings to configure their schedule.</p>
              )}

              <div className="settings-actions">
                <button className="primary-button" type="button" onClick={() => setViewMode('month')}>
                  Save and return
                </button>
              </div>
            </article>
          </section>
        </section>
      ) : viewMode === 'day-config' ? (
        <section className="app-screen day-screen" aria-labelledby="day-title">
          <header className="topbar hero-card day-topbar">
            <div>
              <p className="eyebrow">Day configure</p>
              <h2 id="day-title">{formatDayLabel(selectedDayKey)}</h2>
            </div>
            <div className="topbar-actions">
              <div className="status-pill">Signed in as {activeUser?.name || displayName}</div>
              <button className="nav-button settings-button" type="button" onClick={() => setViewMode('global-settings')}>
                Global settings
              </button>
              <button className="nav-button settings-button" type="button" onClick={() => setViewMode('user-settings')}>
                User settings
              </button>
              <button className="nav-button settings-button" type="button" onClick={() => setViewMode('month')}>
                Back to month
              </button>
            </div>
          </header>

          <article className="hero-card day-panel">
            <div className="day-overview">
              <div className="day-overview-heading">
                <div>
                  <p className="eyebrow">Day graph</p>
                  <h3>{formatDayLabel(selectedDayKey)}</h3>
                </div>
                <div className="day-overview-grid">
                  <div className="summary-stat">
                    <strong>{users.length || 0}</strong>
                    <span>lanes in this graph</span>
                  </div>
                  <div className="summary-stat">
                    <strong>{selectedDayDetails.userId ? 'Assigned' : 'Open'}</strong>
                    <span>day status</span>
                  </div>
                  <div className="summary-stat">
                    <strong>{globalSettings.busyColor}</strong>
                    <span>busy day color</span>
                  </div>
                </div>
              </div>

              <p className="day-helper">
                The graph shows anonymous colored lanes so the shape stays readable without labels.
              </p>
            </div>

            <div className="day-chart-wrap">
              <div
                className="day-chart"
                style={{ '--lane-count': Math.max(dayBlocks.length, 1), '--hour-span': Math.max(globalSettings.visibleEndHour - globalSettings.visibleStartHour, 1) }}
                role="table"
                aria-label="Day schedule graph"
              >
                <div className="day-chart-rail" aria-hidden="true">
                  {Array.from({ length: Math.max(globalSettings.visibleEndHour - globalSettings.visibleStartHour, 0) + 1 }, (_, index) => {
                    const hour = globalSettings.visibleStartHour + index;

                    return (
                      <div key={hour} className="day-chart-rail-label" style={{ top: `${(index / Math.max(globalSettings.visibleEndHour - globalSettings.visibleStartHour, 1)) * 100}%` }}>
                        {formatHourLabel(hour)}
                      </div>
                    );
                  })}
                </div>

                <div className="day-chart-lanes">
                  {dayBlocks.length ? (
                    dayBlocks.map((lane, laneIndex) => (
                      <div key={lane.user.id} className="day-lane" role="row">
                        <div className="day-lane-track" aria-hidden="true">
                          {lane.blocks.length ? (
                            lane.blocks.map((block, blockIndex) => {
                              const duration = Math.max(block.end - block.start, 0);
                              const top = ((block.start - globalSettings.visibleStartHour) / Math.max(globalSettings.visibleEndHour - globalSettings.visibleStartHour, 1)) * 100;
                              const height = (duration / Math.max(globalSettings.visibleEndHour - globalSettings.visibleStartHour, 1)) * 100;
                              const blockColor = block.state === 'busy' ? lane.laneColor : lane.laneColorSoft;

                              return (
                                <div
                                  key={`${lane.user.id}-${blockIndex}`}
                                  className={`day-lane-block ${block.state}`}
                                  style={{ top: `${top}%`, height: `${height}%`, backgroundColor: blockColor, borderColor: blockColor }}
                                />
                              );
                            })
                          ) : (
                            <div className="day-lane-empty" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="day-chart-empty" role="cell">
                      Add users in Global settings to build the graph.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section className="app-screen" aria-labelledby="calendar-title">
          <header className="topbar hero-card">
            <div>
              <p className="eyebrow">Monthly schedule</p>
              <h2 id="calendar-title">Calendar overview</h2>
            </div>
            <div className="topbar-actions">
              <div className="status-pill">Signed in as {activeUser?.name || displayName}</div>
              <button className="nav-button settings-button" type="button" onClick={() => setViewMode('global-settings')}>
                Global settings
              </button>
              <button className="nav-button settings-button" type="button" onClick={() => setViewMode('user-settings')}>
                User settings
              </button>
            </div>
          </header>

          <article className="hero-card calendar-panel">
            <div className="calendar-header">
              <div>
                <p className="eyebrow">Month</p>
                <h3 id="month-name">{monthName}</h3>
              </div>
              <div className="nav-group" aria-label="Month navigation">
                <button className="nav-button" type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>
                  {'<'}
                </button>
                <button className="nav-button" type="button" aria-label="Next month" onClick={() => moveMonth(1)}>
                  {'>'}
                </button>
              </div>
            </div>

            <div className="weekday-row" aria-hidden="true">
              {weekdayNames.map((dayName) => (
                <div key={dayName} className="weekday">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="calendar-grid" role="grid" aria-labelledby="month-name">
              {cells}
            </div>
          </article>

          <section className="calendar-footer hero-card">
            <div className="summary-stat">
              <strong>{totalDays}</strong>
              <span>days in view</span>
            </div>
            <div className="summary-stat">
              <strong>{users.length}</strong>
              <span>saved users</span>
            </div>
            <div className="summary-stat">
              <strong>{formatHourLabel(globalSettings.visibleStartHour)}</strong>
              <span>visible from</span>
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
