
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
    
    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params

    // Find the active attempt
    const attempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId,
        status: "IN_PROGRESS"
      },
      include: {
        quiz: {
          include: {
            quizQuestions: {
              include: {
                question: {
                  select: {
                    id: true,
                    title: true,
                    content: true,
                    type: true,
                    options: true,
                    correctAnswer: true,
                    explanation: true,
                    difficulty: true
                  }
                }
              },
              orderBy: {
                order: "asc"
              }
            }
          }
        },
        answers: {
          select: {
            questionId: true,
            userAnswer: true
          }
        }
      }
    })

    if (!attempt) {
      return NextResponse.json(
        { message: "No active quiz attempt found" },
        { status: 404 }
      )
    }

    // Format questions for the frontend
    const questions = attempt.quiz.quizQuestions.map(qq => ({
      id: qq.question.id,
      title: qq.question.title,
      content: qq.question.content,
      type: qq.question.type,
      options: qq.question.options,
      correctAnswer: qq.question.correctAnswer,
      explanation: qq.question.explanation,
      difficulty: qq.question.difficulty,
      order: qq.order,
      points: qq.points
    }))

    return NextResponse.json({
      id: attempt.id,
      quizId: attempt.quizId,
      status: attempt.status,
      timeLimit: attempt.quiz.timeLimit,
      startedAt: attempt.startedAt,
      questions,
      answers: attempt.answers
    })
  } catch (error) {
    console.error("Error fetching quiz attempt:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
