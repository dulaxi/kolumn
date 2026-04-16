export const TOOLS = [
  {
    name: "create_card",
    description: "Create a new card on a kanban board. Populate all fields you can infer from context — icon, description, priority, labels, checklist, assignee, due_date.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Card title" },
        description: { type: "string", description: "Detailed card description" },
        board: { type: "string", description: "Board name to create the card in" },
        column: { type: "string", description: "Column name (defaults to first column if omitted)" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Card priority" },
        icon: { type: "string", description: "Phosphor icon name (e.g. Layout, CreditCard, Bug)" },
        labels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              color: { type: "string", enum: ["red", "blue", "green", "yellow", "purple", "pink", "gray"] },
            },
            required: ["text", "color"],
          },
          description: "Labels to attach to the card",
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
    description: "Move a card to a different column on the same or different board.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to move" },
        to_column: { type: "string", description: "Destination column name" },
        to_board: { type: "string", description: "Destination board name (if moving across boards)" },
      },
      required: ["card_title", "to_column"],
    },
  },
  {
    name: "update_card",
    description: "Update one or more fields on an existing card.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to update" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            icon: { type: "string" },
            labels: { type: "array", items: { type: "object", properties: { text: { type: "string" }, color: { type: "string" } } } },
            checklist: { type: "array", items: { type: "string" } },
            assignee: { type: "string" },
            due_date: { type: "string" },
          },
          description: "Fields to update",
        },
      },
      required: ["card_title", "updates"],
    },
  },
  {
    name: "delete_card",
    description: "Delete a card. Always ask the user for confirmation before executing this action.",
    input_schema: {
      type: "object",
      properties: {
        card_title: { type: "string", description: "Title of the card to delete" },
        board: { type: "string", description: "Board name the card belongs to" },
      },
      required: ["card_title"],
    },
  },
  {
    name: "create_board",
    description: "Create a new kanban board with custom columns.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Board name" },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Column names in order (defaults to To Do, In Progress, Done)",
        },
        icon: { type: "string", description: "Phosphor icon name for the board" },
      },
      required: ["name"],
    },
  },
  {
    name: "search_cards",
    description: "Search cards across all accessible boards. Use this for finding cards, listing due/overdue items, or answering questions about what exists.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query — matched against card titles, descriptions, labels" },
        filters: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["low", "medium", "high"] },
            assignee: { type: "string" },
            due: { type: "string", enum: ["today", "overdue", "this_week"] },
            board: { type: "string" },
            completed: { type: "boolean" },
          },
          description: "Optional filters to narrow results",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "summarize_board",
    description: "Get a summary of a board's current state — columns, card counts, who's working on what, blockers.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name to summarize" },
      },
      required: ["board"],
    },
  },
] as const
