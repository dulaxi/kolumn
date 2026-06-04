// Welcome / onboarding board — content lives here as a pure data file
// so we can iterate on copy + structure independently of how it gets
// instantiated. Schema mirrors Kolumn's real card shape; the only
// pre-rendered representation is at /sandbox/onboarding-board.

export const ONBOARDING_BOARD_LABELS = {
  welcome:  { id: 'welcome',  text: 'welcome',  color: 'yellow' },
  learn:    { id: 'learn',    text: 'try-this', color: 'blue'   },
  style:    { id: 'style',    text: 'style',    color: 'pink'   },
  pro:      { id: 'pro',      text: 'pro',      color: 'purple' },
  done:     { id: 'done',     text: 'done',     color: 'green'  },
}

export const ONBOARDING_BOARD = {
  name: 'Welcome to Kolumn',
  icon: 'hand-waving',
  description:
    'A working board you can poke at. Drag, click, edit — every card here ' +
    'teaches you one thing Kolumn does. Use it as a sandbox; delete it when ' +
    'you don’t need it anymore.',
  labels: ONBOARDING_BOARD_LABELS,
  columns: [
    {
      id: 'todo',
      title: 'To do',
      cards: [
        {
          id: 'welcome',
          icon: 'hand-waving',
          title: 'Welcome to Kolumn',
          priority: 'medium',
          labels: ['welcome'],
          description:
            'Kolumn is a kanban-first project tool with Claude as a teammate. ' +
            'Drag this card to "In progress" to start the tour.',
          checklist: [
            { text: 'Read this card',         completed: true  },
            { text: 'Drag me to In progress', completed: false },
          ],
        },
        {
          id: 'labels',
          icon: 'tag',
          title: 'Try labels',
          priority: 'low',
          labels: ['learn'],
          description:
            'Labels group work across cards. Click + Labels, type ' +
            '"practice", and press Enter. Pick any color.',
          checklist: [
            { text: 'Open this card',                 completed: false },
            { text: 'Click + Labels',                 completed: false },
            { text: 'Add a label called "practice"',  completed: false },
          ],
        },
        {
          id: 'due-date',
          icon: 'calendar-blank',
          title: 'Set a due date',
          priority: 'medium',
          labels: ['learn'],
          dueDate: 'tomorrow',
          description:
            'Pin work to a date. Click the date pill below and pick any ' +
            'day. Cards overdue go copper; today goes honey; future goes lime.',
          checklist: [
            { text: 'Click the date pill', completed: false },
            { text: 'Choose any date',     completed: false },
          ],
        },
        {
          id: 'checklist',
          icon: 'list-checks',
          title: 'Add a checklist',
          priority: 'low',
          labels: ['learn'],
          description:
            'Break work into small steps. Open this card and type three ' +
            'subtasks. Tick them off as you go.',
          checklist: [],
        },
      ],
    },
    {
      id: 'doing',
      title: 'In progress',
      cards: [
        {
          id: 'icon-style',
          icon: 'sparkle',
          title: 'Click my icon to flip its style',
          priority: 'low',
          labels: ['style'],
          description:
            'Card icons have two styles — boxed and plain. Tap mine ' +
            'and watch every card flip together. Tap again to flip back.',
        },
        {
          id: 'label-style',
          icon: 'paint-brush',
          title: 'Click my /style label to flip its style',
          priority: 'low',
          labels: ['style'],
          description:
            'Labels render three ways: prose, outlined pill, and color ' +
            'dot. Tap any label on me to cycle through them — board-wide.',
        },
      ],
    },
    {
      id: 'done',
      title: 'Done',
      cards: [
        {
          id: 'chat',
          icon: 'chat-circle-dots',
          title: 'Ask Claude for help',
          priority: 'high',
          labels: ['pro'],
          description:
            'Open the chat panel on the right (or press ⌘K) and try ' +
            '"Plan a launch board for me." Claude reads your boards and ' +
            'can create, move, and edit cards for you.',
        },
        {
          id: 'customize',
          icon: 'wrench',
          title: 'Make this board yours',
          priority: 'medium',
          labels: ['learn'],
          description:
            'Rename columns, drag them around, pick a new board icon. ' +
            'Boards bend to fit your work — not the other way around.',
          checklist: [
            { text: 'Rename a column',       completed: false },
            { text: 'Reorder the columns',   completed: false },
            { text: 'Change the board icon', completed: false },
          ],
        },
        {
          id: 'ready',
          icon: 'rocket-launch',
          title: 'You’re ready',
          priority: 'low',
          labels: ['done'],
          completed: true,
          description:
            'Make a fresh board for your real work. Keep this one around ' +
            'as a cheat sheet — or delete it from the board menu.',
        },
      ],
    },
  ],
}
