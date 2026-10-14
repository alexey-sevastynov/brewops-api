import { Logger } from "@nestjs/common";
import { sendMail } from "../../../resources/mail-verification/mail-service";
import { getRequiredEnv } from "../../../common/utils/infra/env-functions";
import { envKeys } from "../../../common/enums/infra/env-key";

const logger = new Logger("UserEmailNotification");

interface UserCreatedNotificationData {
    email: string;
    userName: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
}

interface UserDeletedNotificationData {
    email: string;
    userName: string;
    userId: string;
    workspacesCount: number;
}

export async function sendAdminUserCreatedNotification(data: UserCreatedNotificationData): Promise<void> {
    try {
        const adminEmail = getRequiredEnv(envKeys.nodeMailerUser);
        const namePart = [data.firstName, data.lastName].filter(Boolean).join(" ") || "Не вказано";

        await sendMail({
            to: adminEmail,
            subject: `[BrewOps] 🚀 Новий користувач: ${data.email}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                    <h2 style="color: #10b981; margin-top: 0;">Новий користувач у системі BrewOps</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                        <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Email:</td><td style="padding: 8px 0; font-weight: bold; color: #111827;">${data.email}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Юзернейм:</td><td style="padding: 8px 0; color: #111827;">${data.userName}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Ім'я / Прізвище:</td><td style="padding: 8px 0; color: #111827;">${namePart}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Телефон:</td><td style="padding: 8px 0; color: #111827;">${data.phoneNumber || "Не вказано"}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">ID користувача:</td><td style="padding: 8px 0; font-family: monospace; color: #4b5563;">${data.userId}</td></tr>
                    </table>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
                        Це автоматичне системне сповіщення платформи BrewOps.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        logger.error("Failed to send admin user created notification", error);
    }
}

export async function sendAdminUserDeletedNotification(data: UserDeletedNotificationData): Promise<void> {
    try {
        const adminEmail = getRequiredEnv(envKeys.nodeMailerUser);

        await sendMail({
            to: adminEmail,
            subject: `[BrewOps] 🗑️ Користувача видалено: ${data.email}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                    <h2 style="color: #ef4444; margin-top: 0;">Користувача та всі пов'язані дані видалено</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                        <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Email:</td><td style="padding: 8px 0; font-weight: bold; color: #111827;">${data.email}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Юзернейм:</td><td style="padding: 8px 0; color: #111827;">${data.userName}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">ID користувача:</td><td style="padding: 8px 0; font-family: monospace; color: #4b5563;">${data.userId}</td></tr>
                        <tr><td style="padding: 8px 0; color: #6b7280;">Видалено воркспейсів:</td><td style="padding: 8px 0; color: #111827;">${data.workspacesCount}</td></tr>
                    </table>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
                        Всі пов'язані кофейні, звіти, співробітники та піддокументи успішно очищено з бази даних.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        logger.error("Failed to send admin user deleted notification", error);
    }
}
