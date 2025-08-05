
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params

    // Get quiz details
    const quiz = await db.quiz.findUnique({
      where: { id },
      select: {
        maxAttempts: true,
        title: true
      }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Get user attempts for this quiz
    const attempts = await db.quizAttempt.findMany({
      where: {
        quizId: id,
        userId
      },
      select: {
        id: true,
        status: true,
        score: true,
        totalPoints: true,
        timeTaken: true,
        startedAt: true,
        submittedAt: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    const submittedAttempts = attempts.filter(attempt => attempt.status === AttemptStatus.SUBMITTED)
    const inProgressAttempt = attempts.find(attempt => attempt.status === AttemptStatus.IN_PROGRESS)

    return NextResponse.json({
      quiz: {
        title: quiz.title,
        maxAttempts: quiz.maxAttempts
      },
      userAttemptCount: submittedAttempts.length,
      canTakeQuiz: (quiz.maxAttempts === null || submittedAttempts.length < quiz.maxAttempts) && !inProgressAttempt,
      hasActiveAttempt: !!inProgressAttempt,
      attempts: submittedAttempts,
      activeAttempt: inProgressAttempt
    })
  } catch (error) {
    console.error("Error fetching user attempts:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
