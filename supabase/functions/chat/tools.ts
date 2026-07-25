export const TOOLS = [
  {
    name: "create_card",
    description: "Create a new card on the current board. The board is determined by the surface you're called from — do not specify it. Populate all fields you can infer from context — icon, description, priority, labels, checklist, assignee, due_date.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Card title (1–200 chars)" },
        description: { type: "string", description: "Detailed card description (markdown, truncated to 5000 chars)" },
        column: { type: "string", description: "Column name (defaults to first column if omitted)" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Card priority" },
        icon: { type: "string", description: "Phosphor icon name in kebab-case (e.g. rocket, credit-card, bug)" },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Label texts. The server matches case-insensitively against existing labels on the board; unseen texts create a new label with a deterministic color.",
        },
        checklist: {
          type: "array",
          items: { type: "string" },
          description: "Checklist items (subtasks)",
        },
        assignee: { type: "string", description: "Display name of assignee" },
        due_date: { type: "string", description: "Due date as ISO string (YYYY-MM-DD)" },
      },
      required: ["title"],
    },
  },
  {
    name: "move_card",
    description: "Move a card to a different column on the current board. The board is fixed by the surface you're called from — there is no cross-board move.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to move (matched case-insensitively on the current board)" },
        to_column: { type: "string", description: "Destination column name on the current board" },
        cardId: { type: "string", description: "Internal use only — do not specify unless an explicit card ID was provided to you. Always prefer card_title." },
      },
      required: ["card_title", "to_column"],
    },
  },
  {
    name: "update_card",
    description: "Update one or more fields on an existing card on the current board. Only fields you include in 'updates' are changed; omit fields to leave them alone. To clear a field (remove assignee, due_date, icon, etc.), set it to null explicitly.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to update (matched case-insensitively on the current board)" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string", description: "New title (1-200 chars; first letter is auto-capitalized if needed)" },
            description: { type: "string", description: "New description (markdown). Set to null to clear." },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "New priority" },
            icon: { type: "string", description: "Phosphor icon name in kebab-case. Set to null to clear." },
            labels: { type: "array", items: { type: "string" }, description: "Label texts. The server matches case-insensitively against existing labels on the board; unseen texts create a new label with a deterministic color. Replaces all labels. Use [] or null to clear." },
            checklist: { type: "array", items: { type: "string" }, description: "Replaces full checklist. Use [] or null to clear." },
            assignee: { type: "string", description: "Display name of assignee. Set to null to unassign." },
            due_date: { type: "string", description: "YYYY-MM-DD or ISO string. Set to null to remove the due date." },
            completed: { type: "boolean", description: "Mark the card complete (true) or uncomplete (false). The card stays in its current column." },
          },
          description: "Fields to update. Must have at least one field. Null on a field clears it; missing fields are left alone.",
        },
        cardId: { type: "string", description: "Internal use only — do not specify unless an explicit card ID was provided to you. Always prefer card_title." },
      },
      required: ["card_title", "updates"],
    },
  },
  {
    name: "delete_card",
    description: "Delete a card on the current board. The delete is reversible for 5 seconds via an undo toast in the UI, but the action still requires clear user intent — never call this speculatively.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to delete (matched case-insensitively on the current board)" },
        cardId: { type: "string", description: "Internal use only — do not specify unless an explicit card ID was provided to you. Always prefer card_title." },
      },
      required: ["card_title"],
    },
  },
  {
    name: "duplicate_card",
    description: "Duplicate an existing card on the current board. The new card carries the exact same title and inherits the source's fields (description, labels, checklist, priority, icon, assignees, due_date) and lands in the same column unless to_column is specified. The board is fixed by the surface — there is no cross-board duplicate.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to duplicate (matched case-insensitively on the current board)" },
        to_column: { type: "string", description: "Destination column name on the current board. Defaults to the source card's column." },
        cardId: { type: "string", description: "Internal use only — do not specify unless an explicit card ID was provided to you. Always prefer card_title." },
      },
      required: ["card_title"],
    },
  },
  {
    name: "toggle_checklist",
    description: "Check or uncheck specific checklist items on a card by 0-based index. Indices outside the card's checklist range are skipped silently.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card on the current board" },
        items: { type: "array", items: { type: "number" }, description: "Indices of checklist items to toggle (0-based)" },
        done: { type: "boolean", description: "true = check items, false = uncheck items" },
        cardId: { type: "string", description: "Internal use only — do not specify unless an explicit card ID was provided to you. Always prefer card_title." },
      },
      required: ["card_title", "items", "done"],
    },
  },
  {
    name: "move_cards",
    description: "Batch-move multiple cards on the current board to a destination column. Filters are optional — omitting them means 'all cards on the current board'. The board is fixed by the surface; no cross-board moves.",
    input_schema: {
      type: "object",
      properties: {
        from_column: { type: "string", description: "Filter: source column name. Omit to include any column." },
        card_titles: { type: "array", items: { type: "string" }, description: "Filter: only these card titles. Omit to include all." },
        to_column: { type: "string", description: "Destination column name on the current board" },
      },
      required: ["to_column"],
    },
  },
  {
    name: "update_cards",
    description: "Batch-update fields on multiple cards on the current board. Filters are optional — omitting them means 'all cards on the current board'. Updates supports the same field set as update_card (with null-clear semantics). The board is fixed by the surface; no cross-board updates.",
    input_schema: {
      type: "object",
      properties: {
        column: { type: "string", description: "Filter: only cards in this column" },
        card_titles: { type: "array", items: { type: "string" }, description: "Filter: only these card titles" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string", description: "New title (rarely useful for a batch — typically you don't want all cards to share one title)" },
            description: { type: "string", description: "Description (markdown). Set to null to clear." },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            icon: { type: "string", description: "Phosphor icon name in kebab-case. Set to null to clear." },
            labels: { type: "array", items: { type: "string" }, description: "Label texts. The server matches case-insensitively against existing labels on the board; unseen texts create a new label with a deterministic color. Replaces all labels on every matched card. Use [] or null to clear." },
            checklist: { type: "array", items: { type: "string" }, description: "Replaces full checklist on every matched card. Use [] or null to clear." },
            assignee: { type: "string", description: "Display name. Set to null to unassign." },
            due_date: { type: "string", description: "YYYY-MM-DD. Set to null to remove the due date." },
            completed: { type: "boolean", description: "Mark cards complete or uncomplete. They stay in their current column." },
          },
          description: "Fields to update on all matching cards. Null clears; missing fields are left alone.",
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "complete_cards",
    description: "Batch-mark multiple cards on the current board as complete (or uncomplete via uncomplete=true). Cards stay in their current column — completion is a flag, not a position. Filters are optional — omitting them means 'all cards on the current board'.",
    input_schema: {
      type: "object",
      properties: {
        column: { type: "string", description: "Filter: only cards in this column" },
        card_titles: { type: "array", items: { type: "string" }, description: "Filter: only these card titles" },
        uncomplete: { type: "boolean", description: "Set true to mark cards as NOT complete (defaults to false = mark complete)" },
      },
    },
  },
  {
    name: "create_board",
    description: "Create a new kanban board with custom columns. NOT callable from the board pill — only from the chat / dashboard surface.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Board name" },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Column names in order (defaults to To Do, In Progress, Done)",
        },
        icon: { type: "string", description: "Phosphor icon name in kebab-case (e.g. rocket, credit-card, folder)" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_board",
    description: "Rename the current board or change its icon. Target board is the pill's host — no board identifier needed.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New board name (omit to keep current)" },
        icon: { type: "string", description: "New Phosphor icon name in kebab-case (omit to keep current)" },
      },
    },
  },
  {
    name: "delete_board",
    description: "Delete the current board and all its columns and cards. Reversible for 5 seconds via an undo toast. Target board is the pill's host — no identifier needed.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "add_column",
    description: "Add a new column to the current board. Target board is the pill's host.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Column title" },
        position: { type: "number", description: "Insert position (0-based index). Defaults to end." },
      },
      required: ["title"],
    },
  },
  {
    name: "delete_column",
    description: "Delete a column on the current board and all its cards. Reversible for 5 seconds via an undo toast. Target board is the pill's host.",
    input_schema: {
      type: "object",
      properties: {
        column: { type: "string", description: "Column title to delete" },
        colId: { type: "string", description: "Internal use only — do not specify unless an explicit column ID was provided to you. Always prefer column (name)." },
      },
      required: ["column"],
    },
  },
  {
    name: "invite_member",
    description: "Invite a user by email to the current workspace (inferred from the pill's host board).",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Email address to invite" },
      },
      required: ["email"],
    },
  },
  {
    name: "remove_member",
    description: "Remove a member from the current workspace (inferred from the pill's host board). Always ask the user for confirmation before executing — this action has no undo.",
    input_schema: {
      type: "object",
      properties: {
        display_name: { type: "string", description: "Display name of the member to remove" },
      },
      required: ["display_name"],
    },
  },
  {
    name: "search_cards",
    description: "Read-only: search the user's cards across all their boards by text. Matches card titles, descriptions, and assignee names. Returns matching cards with their ids, board, column, priority, and due date. Never modifies anything.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for (case-insensitive)" },
        board: { type: "string", description: "Optional: restrict the search to this board (by name)" },
        include_completed: { type: "boolean", description: "Optional: include completed cards (default false)" },
      },
      required: ["query"],
    },
  },
  {
    name: "summarize_board",
    description: "Read-only: get a structured snapshot of one board — its columns in order, the cards in each, and totals (cards, completed, overdue). Never modifies anything.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name to summarize" },
      },
      required: ["board"],
    },
  },
] as const

// The chat surface's read-only allowlist — consumed by tier.filterToolsForMode.
export const CHAT_READ_TOOLS = ["search_cards", "summarize_board"]
