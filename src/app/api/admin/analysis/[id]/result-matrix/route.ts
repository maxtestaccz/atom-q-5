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

    // Get all users who have access to this quiz or have attempted it
    const quizUsers = await db.quizUser.findMany({
      where: { quizId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    const attempts = await db.quizAttempt.findMany({
      where: { quizId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        answers: true
      }
    })

    // Create a map of user attempts
    const userAttempts = new Map()
    attempts.forEach(attempt => {
      userAttempts.set(attempt.userId, attempt)
    })

    // Get quiz max attempts
    const quiz = await db.quiz.findUnique({
      where: { id },
      select: { maxAttempts: true }
    })

    // Combine quiz users and their attempts
    const resultMatrix = quizUsers.map(quizUser => {
      const attempt = userAttempts.get(quizUser.userId)
      
      if (attempt) {
        const errors = attempt.answers.filter((answer: any) => !answer.isCorrect).length
        
        return {
          id: attempt.id,
          user: attempt.user,
          status: attempt.status,
          score: attempt.score,
          timeTaken: attempt.timeTaken,
          errors,
          submittedAt: attempt.submittedAt
        }
      } else {
        return {
          id: `user-${quizUser.userId}`,
          user: quizUser.user,
          status: "NOT_STARTED",
          score: undefined,
          timeTaken: undefined,
          errors: undefined,
          submittedAt: undefined
        }
      }
    })

    return NextResponse.json(resultMatrix)
  } catch (error) {
    console.error("Error fetching result matrix:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}