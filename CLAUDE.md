# PharmaTrack Mobile App

## Purpose
Generate React Native + Expo mobile app code that mirrors the PharmaTrack
web frontend in architecture, data models, API patterns, and design.

## Frontend Knowledge Graph
/home/nenadpopovic_/College/2/SE/PharmaTrack_Frontend/frontend/graphify-out/GRAPH_REPORT.md

## Backend Knowledge Graph
/home/nenadpopovic_/College/2/SE/PharmaTrack_Backend/graphify-out/GRAPH_REPORT.md

## Source Paths
- Frontend: /home/nenadpopovic_/College/2/SE/PharmaTrack_Frontend/frontend/
- Backend: /home/nenadpopovic_/College/2/SE/PharmaTrack_Backend/

## Key patterns to always follow
- API calls must mirror apiUrl() from frontend lib/api.ts
- Data models must match: PharmacyDetails, MedicationDetails, MedicationDose, City
- Time formatting must match: formatTime(), formatDateTime(), formatDutyTimeRange()
- Auth: backend uses sessions but mobile needs JWT — check AuthenticationService
- Notifications: NotificationsService + NotificationsController already exist, extend them
- LLM/symptoms: EmbeddingService already calls OpenAI — expose via new mobile endpoint
- Medication search: MedicationRepository uses EmbeddingService — voice search plugs in here

## Stack
- React Native + Expo (managed workflow)
- Expo Router (file-based navigation)
- NativeWind (Tailwind for React Native)
- react-native-maps + directions
- expo-notifications
- expo-av + Whisper (voice search)
- Anthropic/OpenAI API via backend proxy

## Use /advisor before starting any new feature
