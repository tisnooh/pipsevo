import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "../../context/I18nContext";
import { authFieldClass } from "./AuthLayout";

export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();
  return <div className="relative">
    <input {...props} type={visible ? "text" : "password"} className={`${authFieldClass} pr-14`} />
    <button type="button" aria-controls={props.id} aria-pressed={visible} aria-label={visible ? t("Masquer le mot de passe", "Hide password") : t("Afficher le mot de passe", "Show password")} onClick={() => setVisible(value => !value)} className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-lg text-[#A9B0C2] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B58BFF]">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  </div>;
}
