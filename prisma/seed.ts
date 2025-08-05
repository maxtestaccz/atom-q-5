import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin@atomcode.dev', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@atomcode.dev' },
    update: {},
    create: {
      email: 'admin@atomcode.dev',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  // Create sample regular user
  const userPassword = await bcrypt.hash('user123', 12)
  
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Test User',
      password: userPassword,
      role: 'USER',
    },
  })

  // Create default settings
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteTitle: 'Atom Q',
      siteDescription: 'Atom Q for Take quizzes and test your knowledge',
    },
  })

  // Create sample categories
  // const categories = await Promise.all([
  //   prisma.category.upsert({
  //     where: { name: 'General Knowledge' },
  //     update: {},
  //     create: {
  //       name: 'General Knowledge',
  //       description: 'General knowledge questions',
  //     },
  //   }),
  //   prisma.category.upsert({
  //     where: { name: 'Science' },
  //     update: {},
  //     create: {
  //       name: 'Science',
  //       description: 'Science and technology questions',
  //     },
  //   }),
  //   prisma.category.upsert({
  //     where: { name: 'History' },
  //     update: {},
  //     create: {
  //       name: 'History',
  //       description: 'Historical events and figures',
  //     },
  //   }),
  // ])

  // Create sample questions
  // const questions = await Promise.all([
  //   prisma.question.upsert({
  //     where: { id: 'q1' },
  //     update: {},
  //     create: {
  //       id: 'q1',
  //       title: 'What is the capital of France?',
  //       content: 'What is the capital of France?',
  //       type: 'MULTIPLE_CHOICE',
  //       options: JSON.stringify(['Paris', 'London', 'Berlin', 'Madrid']),
  //       correctAnswer: 'Paris',
  //       difficulty: 'EASY',
  //       categoryId: categories[0].id,
  //     },
  //   }),
  //   prisma.question.upsert({
  //     where: { id: 'q2' },
  //     update: {},
  //     create: {
  //       id: 'q2',
  //       title: 'What is 2 + 2?',
  //       content: 'What is 2 + 2?',
  //       type: 'MULTIPLE_CHOICE',
  //       options: JSON.stringify(['3', '4', '5', '6']),
  //       correctAnswer: '4',
  //       difficulty: 'EASY',
  //       categoryId: categories[0].id,
  //     },
  //   }),
  //   prisma.question.upsert({
  //     where: { id: 'q3' },
  //     update: {},
  //     create: {
  //       id: 'q3',
  //       title: 'Earth is the third planet from the Sun.',
  //       content: 'Earth is the third planet from the Sun.',
  //       type: 'TRUE_FALSE',
  //       options: JSON.stringify(['True', 'False']),
  //       correctAnswer: 'True',
  //       difficulty: 'EASY',
  //       categoryId: categories[1].id,
  //     },
  //   }),
  // ])

  // Create sample quiz
  // const quiz = await prisma.quiz.create({
  //   data: {
  //     title: 'Sample Quiz',
  //     description: 'A sample quiz to get you started',
  //     categoryId: categories[0].id,
  //     difficulty: 'EASY',
  //     creatorId: admin.id,
  //     quizQuestions: {
  //       create: [
  //         { questionId: questions[0].id, order: 1, points: 1.0 },
  //         { questionId: questions[1].id, order: 2, points: 1.0 },
  //         { questionId: questions[2].id, order: 3, points: 1.0 },
  //       ],
  //     },
  //   },
  // })

  console.log('Seed data created successfully!')
  console.log('Admin user:', admin)
  console.log('Regular user:', user)
  console.log('Settings:', settings)
  // console.log('Categories:', categories.length)
  // console.log('Questions:', questions.length)
  // console.log('Quiz:', quiz)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })