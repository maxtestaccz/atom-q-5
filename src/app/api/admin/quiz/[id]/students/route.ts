import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if quiz exists
    const quiz = await db.quiz.findUnique({
      where: { id }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Get all students with their enrollment status for this quiz
    const students = await db.user.findMany({
      where: { role: UserRole.USER },
      include: {
        quizAttempts: {
          where: { quizId: id },
          select: {
            id: true,
            submittedAt: true,
            score: true,
            startedAt: true
          }
        }
      },
      orderBy: { name: "asc" }
    })

    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      enrolled: student.quizAttempts.length > 0,
      completedAt: student.quizAttempts[0]?.submittedAt,
      score: student.quizAttempts[0]?.score
    }))

    return NextResponse.json(formattedStudents)
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const { studentIds } = await request.json()

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { message: "Student IDs are required" },
        { status: 400 }
      )
    }

    // Check if quiz exists
    const quiz = await db.quiz.findUnique({
      where: { id }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Check for existing enrollments to avoid duplicates
    const existingAttempts = await db.quizAttempt.findMany({
      where: {
        quizId: id,
        userId: { in: studentIds }
      }
    })

    const enrolledStudentIds = existingAttempts.map(attempt => attempt.userId)
    const newStudentIds = studentIds.filter(id => !enrolledStudentIds.includes(id))

    if (newStudentIds.length === 0) {
      return NextResponse.json(
        { message: "All selected students are already enrolled" },
        { status: 400 }
      )
    }

    // Create quiz attempts only for new students
    const quizAttempts = await Promise.all(
      newStudentIds.map(studentId =>
        db.quizAttempt.create({
          data: {
            userId: studentId,
            quizId: id,
            startedAt: new Date(),
          }
        })
      )
    )

    return NextResponse.json({ 
      message: "Students enrolled successfully",
      enrolledCount: quizAttempts.length,
      alreadyEnrolled: enrolledStudentIds.length
    })
  } catch (error) {
    console.error("Error enrolling students:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}