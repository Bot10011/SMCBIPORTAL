# 🎓 SMCBI Student Portal & Enrollment System

<div align="center">

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

</div>

## 📋 Overview

A modern, responsive web application for managing student enrollment, academic records, and administrative tasks at SMCBI. Built with cutting-edge technologies to provide a seamless user experience for students, teachers, administrators, and program heads.

## ✨ Features

### 👥 Multi-User Roles
- **Students** 📚
  - View academic records
  - Access course materials
  - Track enrollment status
  - Manage personal information

- **Teachers** 👨‍🏫
  - Manage class schedules
  - Upload course materials
  - Grade submissions
  - Track student progress

- **Administrators** 👨‍💼
  - User management
  - System configuration
  - Enrollment oversight
  - Report generation

- **Program Heads** 🎯
  - Program management
  - Curriculum oversight
  - Student performance tracking
  - Department coordination

### 🎨 Modern UI/UX
- Responsive design for all devices
- Dark/Light mode support
- Smooth animations and transitions
- Intuitive navigation
- Glass-morphism design elements
- Interactive dashboards

### 🔒 Security Features
- Role-based access control
- Secure authentication
- Protected routes
- Data encryption
- Session management

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/student-portal.git
   cd student-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## 🛠️ Tech Stack

- **Frontend**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Framer Motion
  - React Router
  - React Query

- **Backend**
  - Supabase
  - PostgreSQL
  - Real-time subscriptions

- **Development Tools**
  - Vite
  - ESLint
  - Prettier
  - Git

## 📱 Screenshots

<details>
<summary>📸 View Screenshots</summary>

### Landing Page
![Landing Page](/img/landing.png)

### Dashboard
![Dashboard](/img/dashboard.png)

### Login
![Login](/img/login.png)

</details>

## 🔄 Development Workflow

1. **Branch Naming Convention**
   ```
   feature/feature-name
   bugfix/bug-description
   hotfix/issue-description
   ```

2. **Commit Message Format**
   ```
   type(scope): description
   
   [optional body]
   [optional footer]
   ```

3. **Pull Request Process**
   - Create a feature branch
   - Write clear commit messages
   - Update documentation
   - Request review

## 📈 Project Structure

```
student-portal/
├── public/
│   ├── img/
│   └── favicon.ico
├── src/
│   ├── components/
│   ├── contexts/
│   ├── AdminDB/
│   ├── StudentDB/
│   ├── TeacherDB/
│   ├── ProgramheadDB/
│   ├── RegistrarDB/
│   ├── SuperadminDB/
│   ├── lib/
│   ├── types/
│   └── App.tsx
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Your Name** - *Initial work* - [Your GitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- SMCBI Administration
- All contributors
- Open source community

## 📞 Support

For support, email support@smcbi.edu.ph or open an issue in the repository.

---

<div align="center">
Made with ❤️ by SMCBI Development Team
</div>
