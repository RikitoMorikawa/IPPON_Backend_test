export interface UpdateEmployeeRequestBody {
    client_id: string;
    employee_id: string;
    family_name?: string;
    first_name?: string;
    family_name_kana?: string;
    first_name_kana?: string;
    mail_address?: string;
    personal_phone_number?: string;
    ippn_mail_address?: string;
    role?: string;
}

export interface MailNotificationSetting {
    notification: boolean;
    info_form_operator: boolean;
}

export interface ReceptionHours {
    meeting_place: string[];
    meeting_time: string;
    reception_start_time: string;
    reception_end_time: string;
    blocking_flg: boolean;
    day_of_week: string[];
}

export interface Employee {
    client_id: string;
    register_timestamp: string;
    update_timestamp: string;
    employee_id: string;
    admin_flg: boolean;
    role: string;
    family_name: string;
    first_name: string;
    first_name_kana: string;
    family_name_kana: string;
    mail_address: string;
    ippn_mail_address: string;
    personal_phone_number: string;
    icon_image_path: string;
    s3_path: string;
    mail_notification_setting: MailNotificationSetting[];
    reception_hours: ReceptionHours;
}

export interface CreateEmployeeRequestBody {
    client_id?: string;
    admin_flg?: boolean;
    role?: any;
    family_name: string;
    is_approve?: boolean;
    employee_id?: string;
    type?: string;
    password?: string;
    first_name: string;
    first_name_kana: string;
    family_name_kana: string;
    mail_address: string;
    ippn_mail_address?: string;
    personal_phone_number: string;
    icon_image_path?: string;
    s3_path?: string;
    mail_notification_setting?: MailNotificationSetting[];
    reception_hours?: ReceptionHours;
}

export interface EmployeeData {
    client_id: string;
    register_timestamp: string;
    update_timestamp: string;
    employee_id: string;
    admin_flg: boolean;
    family_name: string;
    first_name: string;
    family_name_kana: string;
    first_name_kana: string;
    ippn_mail_address: string;
    personal_mail_number: string;
    icon_image_path: string;
    s3_path: string;
    mail_notification_setting: any[];
    day_of_week: string[];
    UserId: any,
}