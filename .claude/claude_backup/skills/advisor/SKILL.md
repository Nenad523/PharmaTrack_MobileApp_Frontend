# Advisor

Survey both the frontend and backend knowledge graphs before generating
any mobile app code. Produce a prioritized implementation plan first.

## Steps

1. Read both graph reports:
   - /home/nenadpopovic_/College/2/SE/PharmaTrack_Frontend/frontend/graphify-out/GRAPH_REPORT.md
   - /home/nenadpopovic_/College/2/SE/PharmaTrack_Backend/graphify-out/GRAPH_REPORT.md

2. Identify relevant communities for the task:
   - Pharmacy map/search → Frontend Community 1 + Backend Community 4 (PharmaciesController)
   - Medication search/voice → Frontend Community 2/5 + Backend Community 7 (MedicationController, MedicationRepository, EmbeddingService)
   - Push notifications → Backend Community 0 (NotificationsService, NotificationsController, EmailService)
   - LLM symptoms → Backend Community 1 (EmbeddingService → OpenAI SDK)
   - Auth → Backend Community 0 (AuthenticationController, SessionGuard — check JWT support)

3. Read the relevant source files directly:
   - Frontend: /home/nenadpopovic_/College/2/SE/PharmaTrack_Frontend/frontend/
   - Backend: /home/nenadpopovic_/College/2/SE/PharmaTrack_Backend/src/

4. Note for every feature:
   - Which backend endpoint already exists vs needs to be created
   - Which frontend component to mirror in React Native
   - Data models to replicate exactly (PharmacyDetails, MedicationDetails, MedicationDose, City)
   - Any auth/guard patterns (SessionGuard, RolesGuard) that mobile needs to handle differently

5. Produce an implementation plan:
   - Backend changes needed (if any)
   - Mobile screen/component structure
   - API calls with exact endpoint paths
   - Data flow from API to UI

6. Only then generate code.
