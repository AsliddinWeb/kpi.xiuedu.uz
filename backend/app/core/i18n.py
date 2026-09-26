from fastapi import Request

SUPPORTED_LOCALES = ("uz", "ru", "en")
DEFAULT_LOCALE = "uz"

MESSAGES: dict[str, dict[str, str]] = {
    "invalid_credentials": {
        "uz": "Email yoki parol noto'g'ri",
        "ru": "Неверный email или пароль",
        "en": "Invalid email or password",
    },
    "hemis_oauth_not_configured": {
        "uz": "HEMIS orqali kirish hozircha sozlanmagan",
        "ru": "Вход через HEMIS пока не настроен",
        "en": "HEMIS login is not configured yet",
    },
    "not_authenticated": {
        "uz": "Tizimga kirilmagan",
        "ru": "Вы не авторизованы",
        "en": "Not authenticated",
    },
    "invalid_token": {
        "uz": "Token yaroqsiz yoki muddati o'tgan",
        "ru": "Токен недействителен или истёк",
        "en": "Invalid or expired token",
    },
    "invalid_token_type": {
        "uz": "Noto'g'ri token turi",
        "ru": "Неверный тип токена",
        "en": "Invalid token type",
    },
    "user_not_found_or_inactive": {
        "uz": "Foydalanuvchi topilmadi yoki faol emas",
        "ru": "Пользователь не найден или неактивен",
        "en": "User not found or inactive",
    },
    "refresh_token_missing": {
        "uz": "Refresh token topilmadi",
        "ru": "Refresh-токен не найден",
        "en": "Refresh token not found",
    },
    "refresh_token_invalid": {
        "uz": "Refresh token yaroqsiz yoki muddati o'tgan",
        "ru": "Refresh-токен недействителен или истёк",
        "en": "Refresh token is invalid or expired",
    },
    "not_enough_permissions": {
        "uz": "Ruxsat yetarli emas",
        "ru": "Недостаточно прав",
        "en": "Not enough permissions",
    },
    "setup_already_completed": {
        "uz": "Boshlang'ich sozlash allaqachon yakunlangan",
        "ru": "Первоначальная настройка уже завершена",
        "en": "Initial setup has already been completed",
    },
    "logo_invalid_type": {
        "uz": "Faqat PNG, JPEG, WEBP yoki SVG formatidagi rasm yuklash mumkin",
        "ru": "Можно загрузить только изображение в формате PNG, JPEG, WEBP или SVG",
        "en": "Only PNG, JPEG, WEBP, or SVG image files can be uploaded",
    },
    "logo_too_large": {
        "uz": "Rasm hajmi 5 MB dan oshmasligi kerak",
        "ru": "Размер изображения не должен превышать 5 МБ",
        "en": "Image size must not exceed 5 MB",
    },
    "logo_not_found": {
        "uz": "Logotip topilmadi",
        "ru": "Логотип не найден",
        "en": "Logo not found",
    },
    "hemis_sync_no_identifier": {
        "uz": "Bu xodim HEMIS bilan bog'lanmagan (employee_id_number yo'q) - sinxronlash mumkin emas",
        "ru": "Этот сотрудник не связан с HEMIS (нет employee_id_number) - синхронизация невозможна",
        "en": "This employee has no HEMIS link (no employee_id_number) - cannot sync",
    },
    "hemis_sync_not_found": {
        "uz": "HEMIS'da bu employee_id_number bo'yicha xodim topilmadi",
        "ru": "Сотрудник с этим employee_id_number не найден в HEMIS",
        "en": "No employee found in HEMIS for this employee_id_number",
    },
    "department_not_found": {
        "uz": "Bo'lim topilmadi",
        "ru": "Отдел не найден",
        "en": "Department not found",
    },
    "department_in_use": {
        "uz": "Bo'limni o'chirib bo'lmaydi: unda lavozim, kichik bo'lim yoki xodim bor",
        "ru": "Невозможно удалить отдел: в нём есть должности, дочерние отделы или сотрудники",
        "en": "Cannot delete department: it has positions, sub-departments, or employees",
    },
    "department_invalid_parent": {
        "uz": "Bo'lim o'zining ota-bo'limi bo'la olmaydi",
        "ru": "Отдел не может быть родительским для самого себя",
        "en": "A department cannot be its own parent",
    },
    "position_not_found": {
        "uz": "Lavozim topilmadi",
        "ru": "Должность не найдена",
        "en": "Position not found",
    },
    "position_in_use": {
        "uz": "Lavozimni o'chirib bo'lmaydi: unga xodim biriktirilgan",
        "ru": "Невозможно удалить должность: на неё назначены сотрудники",
        "en": "Cannot delete position: employees are assigned to it",
    },
    "email_already_exists": {
        "uz": "Bu email bilan foydalanuvchi allaqachon mavjud",
        "ru": "Пользователь с таким email уже существует",
        "en": "A user with this email already exists",
    },
    "manager_not_found": {
        "uz": "Ko'rsatilgan rahbar topilmadi",
        "ru": "Указанный руководитель не найден",
        "en": "The specified manager was not found",
    },
    "position_department_mismatch": {
        "uz": "Lavozim ko'rsatilgan bo'limga tegishli emas",
        "ru": "Должность не принадлежит указанному отделу",
        "en": "The position does not belong to the specified department",
    },
    "user_not_found": {
        "uz": "Foydalanuvchi topilmadi",
        "ru": "Пользователь не найден",
        "en": "User not found",
    },
    "excel_missing_columns": {
        "uz": "Excel faylda kerakli ustunlar yo'q: email, full_name, role",
        "ru": "В Excel-файле отсутствуют обязательные столбцы: email, full_name, role",
        "en": "The Excel file is missing required columns: email, full_name, role",
    },
    "excel_unreadable": {
        "uz": "Excel faylni o'qib bo'lmadi",
        "ru": "Не удалось прочитать Excel-файл",
        "en": "Could not read the Excel file",
    },
    "row_missing_required_fields": {
        "uz": "email va full_name maydonlari to'ldirilishi shart",
        "ru": "Поля email и full_name обязательны для заполнения",
        "en": "The email and full_name fields are required",
    },
    "incorrect_current_password": {
        "uz": "Joriy parol noto'g'ri",
        "ru": "Текущий пароль неверен",
        "en": "The current password is incorrect",
    },
    "invalid_role": {
        "uz": "Rol faqat 'manager' yoki 'employee' bo'lishi mumkin",
        "ru": "Роль может быть только 'manager' или 'employee'",
        "en": "Role must be either 'manager' or 'employee'",
    },
    "template_max_score_mismatch": {
        "uz": "Bonusdan tashqari kategoriyalarning maksimal balli yig'indisi 100 bo'lishi shart",
        "ru": "Сумма максимальных баллов небонусных категорий должна равняться 100",
        "en": "Non-bonus categories' max scores must add up to 100",
    },
    "category_max_score_mismatch": {
        "uz": "Kategoriya ichidagi ko'rsatkichlar balli yig'indisi kategoriya maksimal balliga teng bo'lishi shart",
        "ru": "Сумма баллов показателей внутри категории должна равняться максимальному баллу категории",
        "en": "The indicators' max scores within a category must add up to the category's max score",
    },
    "kpi_template_not_found": {
        "uz": "KPI shabloni topilmadi",
        "ru": "Шаблон KPI не найден",
        "en": "KPI template not found",
    },
    "kpi_result_not_found": {
        "uz": "KPI natijasi topilmadi",
        "ru": "Результат KPI не найден",
        "en": "KPI result not found",
    },
    "kpi_template_in_use": {
        "uz": "Shablonni o'zgartirib/o'chirib bo'lmaydi: unga tegishli ko'rsatkichlar bo'yicha arizalar mavjud",
        "ru": "Невозможно изменить/удалить шаблон: по его показателям уже есть заявки",
        "en": "Cannot modify/delete this template: applications already exist for its indicators",
    },
    "kpi_template_assigned": {
        "uz": "Shablonni o'chirib bo'lmaydi: unga hozircha xodimlar tayinlangan",
        "ru": "Невозможно удалить шаблон: он ещё назначен сотрудникам",
        "en": "Cannot delete this template: it is still assigned to employees",
    },
    "kpi_category_not_found": {
        "uz": "KPI kategoriyasi topilmadi",
        "ru": "Категория KPI не найдена",
        "en": "KPI category not found",
    },
    "not_manager_of_user": {
        "uz": "Siz faqat o'z xodimlaringiz uchun bu amalni bajara olasiz",
        "ru": "Вы можете выполнять это действие только для своих сотрудников",
        "en": "You can only do this for your own direct reports",
    },
    "indicator_not_found": {
        "uz": "Ko'rsatkich topilmadi",
        "ru": "Показатель не найден",
        "en": "Indicator not found",
    },
    "ariza_file_required": {
        "uz": "Bu ko'rsatkich uchun kamida bitta dalil-hujjat (fayl) yuklash shart",
        "ru": "Для этого показателя необходимо загрузить хотя бы один файл-подтверждение",
        "en": "At least one evidence file is required for this indicator",
    },
    "invalid_co_authors": {
        "uz": "Hammuallif ma'lumotlari noto'g'ri formatda",
        "ru": "Неверный формат данных о соавторах",
        "en": "Invalid co-author data format",
    },
    "coauthors_not_allowed": {
        "uz": "Bu ko'rsatkich hammuallif ulushini qo'llab-quvvatlamaydi",
        "ru": "Этот показатель не поддерживает распределение между соавторами",
        "en": "This indicator does not support co-author splitting",
    },
    "coauthor_share_invalid": {
        "uz": "Hammualliflar ulushi yig'indisi 100% dan oshmasligi kerak",
        "ru": "Сумма долей соавторов не должна превышать 100%",
        "en": "Co-author shares must not add up to more than 100%",
    },
    "ariza_not_found": {
        "uz": "Ariza topilmadi",
        "ru": "Заявка не найдена",
        "en": "Application not found",
    },
    "invalid_status": {
        "uz": "Noto'g'ri holat qiymati",
        "ru": "Неверное значение статуса",
        "en": "Invalid status value",
    },
    "score_exceeds_max": {
        "uz": "Berilgan ball ko'rsatkichning maksimal balidan oshmasligi kerak",
        "ru": "Выставленный балл не может превышать максимальный балл показателя",
        "en": "The awarded score cannot exceed the indicator's max score",
    },
    "score_exceeds_remaining": {
        "uz": "Bu davr uchun ko'rsatkich bo'yicha to'plangan ball allaqachon maksimal balga yaqin — berilgan ball qolgan sig'imdan oshib ketadi",
        "ru": "Уже накопленный балл по этому показателю за период близок к максимуму — выставленный балл превысит оставшийся лимит",
        "en": "The already-accumulated score for this indicator/period leaves less headroom than the score you're awarding",
    },
    "ariza_not_scoreable": {
        "uz": "Faqat topshirilgan yoki kafedra tomonidan tasdiqlangan arizani baholash mumkin",
        "ru": "Оценить можно только отправленную или подтверждённую кафедрой заявку",
        "en": "Only a submitted or kafedra-endorsed application can be scored",
    },
    "ariza_not_pending_head_approval": {
        "uz": "Faqat rahbar tasdig'ini kutayotgan arizani tasdiqlash/rad etish mumkin",
        "ru": "Подтвердить/отклонить можно только заявку, ожидающую утверждения руководителя",
        "en": "Only an application pending head approval can be approved or rejected here",
    },
    "ariza_not_submitted": {
        "uz": "Faqat topshirilgan (submitted) arizani tasdiqlash mumkin",
        "ru": "Подтвердить можно только отправленную (submitted) заявку",
        "en": "Only a submitted application can be endorsed",
    },
    "ariza_already_scored": {
        "uz": "Baholangan arizani o'chirib bo'lmaydi",
        "ru": "Уже оценённую заявку удалить нельзя",
        "en": "An already-scored application cannot be deleted",
    },
    "file_not_found": {
        "uz": "Fayl topilmadi",
        "ru": "Файл не найден",
        "en": "File not found",
    },
    "user_restricted": {
        "uz": "Sizga yangi ariza topshirish vaqtincha taqiqlangan",
        "ru": "Вам временно запрещено подавать новые заявки",
        "en": "You are temporarily restricted from submitting new applications",
    },
    "category_reviewer_duplicate": {
        "uz": "Bu foydalanuvchi allaqachon shu kategoriyaga baholovchi sifatida tayinlangan",
        "ru": "Этот пользователь уже назначен проверяющим для этой категории",
        "en": "This user is already assigned as a reviewer for this category",
    },
    "category_reviewer_not_found": {
        "uz": "Baholovchi tayinlanmasi topilmadi",
        "ru": "Назначение проверяющего не найдено",
        "en": "Reviewer assignment not found",
    },
    "rank_override_duplicate": {
        "uz": "Bu daraja guruhi uchun ustunlik allaqachon mavjud",
        "ru": "Для этой группы степени уже существует переопределение",
        "en": "An override for this rank group already exists",
    },
    "rank_override_not_found": {
        "uz": "Ustunlik topilmadi",
        "ru": "Переопределение не найдено",
        "en": "Override not found",
    },
    "work_plan_already_exists": {
        "uz": "Siz bu davr uchun allaqachon ish rejasi yaratgansiz",
        "ru": "У вас уже есть рабочий план на этот период",
        "en": "You already have a work plan for this period",
    },
    "work_plan_not_found": {
        "uz": "Ish rejasi topilmadi",
        "ru": "Рабочий план не найден",
        "en": "Work plan not found",
    },
    "summary_not_found": {
        "uz": "Sarhisob topilmadi",
        "ru": "Сводка не найдена",
        "en": "Summary not found",
    },
    "correction_plan_not_found": {
        "uz": "Tuzatish rejasi topilmadi",
        "ru": "План исправления не найден",
        "en": "Correction plan not found",
    },
    "force_majeure_not_found": {
        "uz": "Fors-major bildirishnomasi topilmadi",
        "ru": "Уведомление о форс-мажоре не найдено",
        "en": "Force-majeure declaration not found",
    },
    "incentive_not_found": {
        "uz": "Rag'bat yozuvi topilmadi",
        "ru": "Запись о поощрении не найдена",
        "en": "Incentive record not found",
    },
    "incentive_already_revoked": {
        "uz": "Bu rag'bat allaqachon bekor qilingan",
        "ru": "Это поощрение уже отменено",
        "en": "This incentive has already been revoked",
    },
    "export_not_found": {
        "uz": "Eksport topilmadi",
        "ru": "Экспорт не найден",
        "en": "Export not found",
    },
    "export_not_ready": {
        "uz": "Eksport hali tayyor emas",
        "ru": "Экспорт ещё не готов",
        "en": "Export is not ready yet",
    },
    "bonus_not_approved": {
        "uz": "Avval shu davr uchun bonus hisob-kitobini HR/moliya tasdiqlashi kerak",
        "ru": "Сначала HR/финансы должны подтвердить расчёт бонусов за этот период",
        "en": "HR/finance must approve the bonus calculation for this period first",
    },
    "rate_limit_exceeded": {
        "uz": "Urinishlar soni ko'p. Iltimos, birozdan so'ng qayta urinib ko'ring",
        "ru": "Слишком много попыток. Пожалуйста, попробуйте позже",
        "en": "Too many attempts. Please try again later",
    },
}


def get_locale(request: Request) -> str:
    header = request.headers.get("accept-language", "")
    primary = header.split(",")[0].split("-")[0].strip().lower()
    return primary if primary in SUPPORTED_LOCALES else DEFAULT_LOCALE


def t(key: str, locale: str) -> str:
    translations = MESSAGES[key]
    return translations.get(locale, translations[DEFAULT_LOCALE])
