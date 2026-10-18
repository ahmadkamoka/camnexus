# CamNexus

Build a responsive, professional web application called EduBridge ImpactLab for the PS43 Foundation hackathon challenge in Cameroon.

The application helps a nonprofit assess schools, prioritize educational needs, and compare investment options before allocating resources.

Create three working sections:

1. School Assessment: A form for school name, region, student population, number of computers, electricity reliability (reliable/intermittent/none), internet availability, and primary educational needs. Save submissions locally and display them in a school list. Use 5 clearly labeled fictional sample schools in Cameroon.

2. Priority Dashboard: Assign each school a transparent illustrative priority score from 0 to 100 using its reported needs, computers per student, and infrastructure gaps. Explain how the score is calculated. Allow users to select a school.

3. Investment Simulator: For the selected school, let the user adjust a budget and compare three options: equipment-first, infrastructure-first, and low-tech learning support. Show hypothetical costs, whether each option fits the budget, infrastructure prerequisites, suitability warnings, and estimated students who could be served. Do not claim these estimates are real predictions.

Add a recommendation panel explaining why an option may be preferable, but make clear that PS43 staff and local partners must validate final decisions.

Use a modern, clean nonprofit dashboard design, accessible typography, and mobile-friendly layouts. Add functional navigation. Keep data local without authentication, backend services, paid APIs, or fabricated real-world partnerships. Add a visible note that sample data, costs, and outcomes are illustrative. Prioritize a working demo over complicated extra features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/12a867c9-9829-4948-8944-989a10c30a15).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
