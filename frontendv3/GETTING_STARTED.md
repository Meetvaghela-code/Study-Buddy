# Getting Started with StudyBuddy Frontend v3

A quick guide to set up and run the modern Claude-style UI.

## ✨ What You Get

- **Modern UI Components** - Pre-built Button, Card, Input, and more
- **Beautiful Landing Page** - Showcase your platform with style
- **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- **Dark Theme** - Claude-inspired aesthetic with green accents
- **Smooth Animations** - Powered by Framer Motion
- **Type Safety** - Full TypeScript support

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the beautiful landing page!

## 📂 Project Structure

```
frontendv3/
├── app/
│   ├── page.tsx          ← Landing Page
│   ├── dashboard/        ← Dashboard Page  
│   ├── login/           ← Login Page
│   └── layout.tsx       ← Root Layout
├── components/
│   ├── Navbar.tsx       ← Navigation
│   ├── Footer.tsx       ← Footer
│   └── ui/              ← Reusable Components
│       ├── Button.tsx   ← Button, Card, Badge
│       └── Input.tsx    ← Form Components
├── lib/
│   ├── hooks.ts         ← Custom React Hooks
│   └── utils.ts         ← Utility Functions
├── tailwind.config.ts   ← Tailwind Configuration
└── globals.css          ← Global Styles
```

## 🎨 Key Components

### Button
```tsx
import { Button } from '@/components/ui/Button'

<Button variant="primary" size="lg">
  Get Started
</Button>
```

**Variants:** `primary`, `secondary`, `outline`, `ghost`
**Sizes:** `sm`, `md`, `lg`

### Card
```tsx
import { Card } from '@/components/ui/Button'

<Card hoverable>
  <h3>Title</h3>
  <p>Content</p>
</Card>
```

### Input
```tsx
import { Input } from '@/components/ui/Input'

<Input 
  label="Email"
  placeholder="you@example.com"
  type="email"
/>
```

### Form Hook
```tsx
import { useForm } from '@/lib/hooks'

const { values, handleChange, handleSubmit } = useForm({
  email: '',
  password: '',
})
```

## 🌈 Customization

### Change Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  accent: '#YOUR_COLOR',
  'dark-bg': '#0D0D0D',
  // ... more colors
}
```

### Add New Pages

Create files in `app/` directory:

```bash
app/
├── about/
│   └── page.tsx
├── pricing/
│   └── page.tsx
```

### Create New Components

```bash
components/
├── YourComponent.tsx
└── ui/
    └── YourUIComponent.tsx
```

## 🔗 Navigation

- **Landing Page:** `/`
- **Dashboard:** `/dashboard`
- **Login:** `/login`

## 🧪 Building

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## 📦 Built With

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide Icons** - Beautiful icons

## 🎓 Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

## 💡 Tips

1. **Use the hooks** - `useForm`, `useDebounce`, `useTheme` etc.
2. **Reuse components** - Button, Card, Badge are flexible
3. **Customize easily** - All colors and animations in `globals.css`
4. **Mobile first** - Design works great on small screens first

## 🤝 Need Help?

- Check the component examples in `/components/ui/`
- Look at the landing page implementation in `/app/page.tsx`
- Review utility functions in `/lib/utils.ts`

## 🚀 Next Steps

1. ✅ Install and run the project
2. 📝 Customize colors and branding
3. 🎨 Add your content to pages
4. 📦 Deploy to Vercel or your hosting

---

**Happy building! 🎉**
