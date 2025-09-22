import { compile } from "@autonia/actors";
import RestaurantAiAssistant from "./agents/restaurant_ai_assistant";

(async () => {
  await compile([RestaurantAiAssistant]);
})();
