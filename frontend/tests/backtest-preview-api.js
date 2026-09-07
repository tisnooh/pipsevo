// Isolated preview alias. Never imported from the production source tree.
import axios from "axios";
export const api = axios.create({ baseURL: "http://127.0.0.1:8091/api" });
