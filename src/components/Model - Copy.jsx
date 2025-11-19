import { useFrame } from '@react-three/fiber'
import { useGLTF, useFBX, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useState } from 'react'

export function Model({ emotion = 'neutral', currentAnimation = 'Idle.fbx', isSpeaking = false }) {
  const { nodes, materials } = useGLTF('/model/model(3).glb')

  const group = useRef()
  const [previousAnimation, setPreviousAnimation] = useState('Idle')

  // VISIME LIST
  const visemeList = [
    "viseme_sil","viseme_PP","viseme_FF","viseme_TH",
    "viseme_kk","viseme_CH","viseme_SS","viseme_nn",
    "viseme_RR","viseme_aa","viseme_E","viseme_I",
    "viseme_O","viseme_U"
  ]

  // Helper: robust lookup for morph indices
  function getMorphIndex(dict, name) {
    if (!dict) return undefined
    if (dict[name] !== undefined) return dict[name]
    const lower = name.toLowerCase()
    for (const key of Object.keys(dict)) {
      if (key.toLowerCase() === lower) return dict[key]
    }
    return undefined
  }

  // Load all FBX animations
  const idleAnimation = useFBX('/animation/Idle.fbx')
  const cheeringAnimation = useFBX('/animation/Cheering.fbx')
  const comfortingAnimation = useFBX('/animation/comforting.fbx')
  const danceAnimation = useFBX('/animation/dance.fbx')
  const greetAnimation = useFBX('/animation/greet.fbx')
  const thumbupAnimation = useFBX('/animation/thumbup.fbx')

  // Name animations
  if (idleAnimation.animations[0]) idleAnimation.animations[0].name = 'Idle'
  if (cheeringAnimation.animations[0]) cheeringAnimation.animations[0].name = 'Cheering'
  if (comfortingAnimation.animations[0]) comfortingAnimation.animations[0].name = 'comforting'
  if (danceAnimation.animations[0]) danceAnimation.animations[0].name = 'dance'
  if (greetAnimation.animations[0]) greetAnimation.animations[0].name = 'greet'
  if (thumbupAnimation.animations[0]) thumbupAnimation.animations[0].name = 'thumbup'

  const allAnimations = [
    idleAnimation.animations[0],
    cheeringAnimation.animations[0],
    comfortingAnimation.animations[0],
    danceAnimation.animations[0],
    greetAnimation.animations[0],
    thumbupAnimation.animations[0]
  ].filter(Boolean)

  const { actions } = useAnimations(allAnimations, group)

  // Emotion presets
  const emotions = {
    neutral: {},
    happy: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8, cheekSquintLeft: 0.5, cheekSquintRight: 0.5, eyeSquintLeft: 0.3, eyeSquintRight: 0.3 },
    sad: { mouthFrownLeft: 0.7, mouthFrownRight: 0.7, browDownLeft: 0.6, browDownRight: 0.6, mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4 },
    surprised: { eyeWideLeft: 0.9, eyeWideRight: 0.9, browInnerUp: 0.8, browOuterUpLeft: 0.6, browOuterUpRight: 0.6, jawOpen: 0.6 },
    angry: { browDownLeft: 0.9, browDownRight: 0.9, eyeSquintLeft: 0.8, eyeSquintRight: 0.8, mouthFrownLeft: 0.6, mouthFrownRight: 0.6, noseSneerLeft: 0.5, noseSneerRight: 0.5 },
    disgusted: { noseSneerLeft: 0.8, noseSneerRight: 0.8, mouthUpperUpLeft: 0.7, mouthUpperUpRight: 0.7, eyeSquintLeft: 0.5, eyeSquintRight: 0.5 },
    excited: { mouthSmileLeft: 1.0, mouthSmileRight: 1.0, eyeWideLeft: 0.7, eyeWideRight: 0.7, browInnerUp: 0.6, jawOpen: 0.4 },
    thinking: { browInnerUp: 0.4, browDownLeft: 0.3, eyeLookUpLeft: 0.5, eyeLookUpRight: 0.5, mouthPucker: 0.3 },
    confused: { browInnerUp: 0.6, browDownLeft: 0.4, browOuterUpRight: 0.5, mouthLeft: 0.3, eyeSquintLeft: 0.2 },
    smirk: { mouthSmileRight: 0.8, mouthDimpleRight: 0.5, cheekSquintRight: 0.4, eyeSquintRight: 0.3 },
    kiss: { mouthPucker: 0.9, mouthFunnel: 0.5, eyeSquintLeft: 0.3, eyeSquintRight: 0.3 },
    wink: { eyeBlinkRight: 1.0, mouthSmileLeft: 0.6, mouthSmileRight: 0.6, cheekSquintRight: 0.7 },
    shock: { eyeWideLeft: 1.0, eyeWideRight: 1.0, browInnerUp: 1.0, browOuterUpLeft: 0.8, browOuterUpRight: 0.8, jawOpen: 0.9, mouthFunnel: 0.4 }

  }

  // Play the selected animation
  useEffect(() => {
    if (!actions) return
    const animationName = currentAnimation.replace('.fbx', '')
    if (previousAnimation && actions[previousAnimation]) actions[previousAnimation].fadeOut(0.5)
    if (actions[animationName]) { actions[animationName].reset().fadeIn(0.5).play(); setPreviousAnimation(animationName) }
    else if (actions.Idle) { actions.Idle.reset().fadeIn(0.5).play(); setPreviousAnimation('Idle') }
  }, [currentAnimation, actions, previousAnimation])

  // Play idle initially
  useEffect(() => {
    if (actions && actions.Idle) { actions.Idle.reset().play(); setPreviousAnimation('Idle') }
  }, [actions])

  // FRAME LOOP: emotions + lipsync
  useFrame((state) => {
    const skinnedMeshes = Object.values(nodes).filter(n => n?.isSkinnedMesh)
    const headNode = skinnedMeshes.find(m => m.name.includes('Head') && m.morphTargetDictionary)
    const teethNode = skinnedMeshes.find(m => m.name.includes('Teeth') && m.morphTargetDictionary)
    const tongueNode = skinnedMeshes.find(m => m.name.includes('Tongue') && m.morphTargetDictionary)
    const morphMeshes = [headNode, teethNode, tongueNode].filter(Boolean)

    morphMeshes.forEach(mesh => {
      const dict = mesh.morphTargetDictionary
      const infl = mesh.morphTargetInfluences
      if (!dict || !infl) return
      for (let i = 0; i < infl.length; i++) infl[i] = 0
    })

    // Head emotions only
    if (headNode) {
      const dict = headNode.morphTargetDictionary
      const infl = headNode.morphTargetInfluences
      const currentEmotion = emotions[emotion] || emotions.neutral
      Object.entries(currentEmotion).forEach(([morphName, value]) => {
        const idx = getMorphIndex(dict, morphName)
        if (idx !== undefined) infl[idx] = Math.max(0, Math.min(1, value))
      })
    }

    // Speaking / lipsync
    if (isSpeaking) {
      const t = state.clock.elapsedTime
      const base = (Math.sin(t * 8) + Math.abs(Math.sin(t * 3.2))) * 0.35 + 0.2
      const rand = (Math.sin(t * 13) + Math.cos(t * 7.3)) * 0.1

      morphMeshes.forEach(mesh => {
        const dict = mesh.morphTargetDictionary
        const infl = mesh.morphTargetInfluences
        if (!dict || !infl) return

        let visemeFound = false
        visemeList.forEach((vname, idxV) => {
          const idx = getMorphIndex(dict, vname)
          if (idx !== undefined) {
            visemeFound = true
            const phase = Math.sin(t * (6 + idxV)) * 0.5 + 0.5
            infl[idx] = Math.max(infl[idx], Math.max(0, Math.min(1, base * phase + rand)))
          }
        })

          if (!visemeFound) {
  const jawOpen = getMorphIndex(dict, 'jawOpen')
  const mouthFunnel = getMorphIndex(dict, 'mouthFunnel')
  const mouthPucker = getMorphIndex(dict, 'mouthPucker')

  if (jawOpen !== undefined) infl[jawOpen] = Math.max(infl[jawOpen], Math.min(0.3, base * 0.25))
  if (mouthFunnel !== undefined) infl[mouthFunnel] = Math.max(infl[mouthFunnel], Math.min(0.2, Math.sin(t * 6) * 0.15 + 0.1))
  if (mouthPucker !== undefined) infl[mouthPucker] = Math.max(infl[mouthPucker], Math.min(0.2, Math.cos(t * 5) * 0.15 + 0.1))
}
      })
    }
  })

  return (
    <group ref={group} scale={[6,6,6]} position={[0, -9, 0]} dispose={null}>
      <primitive object={nodes.Hips || nodes.Root || Object.values(nodes)[0]} />
      {Object.values(nodes).map(node => (
        node.isSkinnedMesh ? (
          <skinnedMesh
            key={node.uuid}
            name={node.name}
            geometry={node.geometry}
            material={materials[node.material?.name] || node.material}
            skeleton={node.skeleton}
            morphTargetDictionary={node.morphTargetDictionary}
            morphTargetInfluences={node.morphTargetInfluences}
          />
        ) : null
      ))}
    </group>
  )
}
