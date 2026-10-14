export const telegramApiUrl = "https://api.telegram.org" as const;

export const telegramActions = {
    create: "create",
    update: "update",
    delete: "delete",
} as const;

export const telegramMethods = {
    sendMessage: "sendMessage",
    editMessageText: "editMessageText",
    deleteMessage: "deleteMessage",
} as const;

export const telegramParseModes = {
    markdown: "Markdown",
} as const;

export const telegramLogMessages = {
    createNotification: "Saved Telegram mapping for resource {0}",
    updateNotification: "Updated Telegram message for resource {0} with ID {1}",
    deleteNotification: "Deleted Telegram message for resource ID {0}",
    sendNotificationFailed: "Failed to send Telegram notification",
} as const;

export const telegramWarningMessages = {
    mappingNotFound: "No Telegram mapping found for resource {0} with ID {1}",
    mappingNotFoundById: "No Telegram mapping found for resource ID {0}",
    resourceIdNotFound: "Resource ID not found for resource {0}",
} as const;

export const telegramErrorMessages = {
    apiError: "Telegram API Error",
    requestTimeout: "Telegram API request timed out",
    createNotification: "Error sending create notification for {0}",
    updateNotification: "Error updating Telegram message for {0} with ID {1}",
    deleteNotification: "Error deleting Telegram message for resource ID {0}",
    aiServiceRequired: "AiService is required for messageFactory but was not injected",
    messageSourceNotFound: "No message or messageFactory found for resource: {0}",
} as const;

export const telegramValidationMessages = {
    chatNotConfigured: "Telegram чат не налаштований для цієї кав'ярні.",
} as const;
