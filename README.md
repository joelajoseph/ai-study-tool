A personal study-planning web app. The user uploads their study materials
(class notes, slides, textbook chapters, past quizzes) along with context
(exam date, days remaining, self-rated familiarity per topic), and the app:

1. Parses the materials into usable text/content.
2. Calls an LLM to generate a structured study plan — topics, priority order,
   estimated time per topic, and reasoning — tailored to the timeline and the
   user's stated knowledge gaps.
3. Lets the user chat with an LLM about the uploaded material for follow-up
   questions, with the material and plan as context (not a generic chatbot —
   answers should stay grounded in what was uploaded).
4. Lets the user track progress (mark topics/sessions as done) and regenerate
   the plan as the exam date approaches or new material is added.

This is a single-user personal project. No multi-user support, no auth
system needed beyond a simple password gate if any gate at all. Optimize for
simplicity over scalability.
