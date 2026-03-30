"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

export default function GameCanvas() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserInstance = useRef<Phaser.Game | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!gameRef.current || initializedRef.current) return;
    initializedRef.current = true;

    gameRef.current.innerHTML = "";

    /* ---------------- MOBILE WARNING OVERLAY ---------------- */
    const mobileOverlay = document.createElement("div");
    mobileOverlay.id = "mobileWarning";
    mobileOverlay.style.position = "absolute";
    mobileOverlay.style.top = "0";
    mobileOverlay.style.left = "0";
    mobileOverlay.style.width = "100%";
    mobileOverlay.style.height = "100%";
    mobileOverlay.style.backgroundColor = "#5FA8C9";
    mobileOverlay.style.color = "#ffffff";
    mobileOverlay.style.fontFamily = "Comic Sans MS";
    mobileOverlay.style.fontWeight = "bold";
    mobileOverlay.style.fontSize = "24px";
    mobileOverlay.style.display = "flex";
    mobileOverlay.style.alignItems = "center";
    mobileOverlay.style.justifyContent = "center";
    mobileOverlay.style.textAlign = "center";
    mobileOverlay.style.zIndex = "9999";
    mobileOverlay.style.padding = "20px";
    mobileOverlay.innerText =
      "For a better experience, switch to a larger screen";

    gameRef.current.appendChild(mobileOverlay);

    function checkScreen() {
      mobileOverlay.style.display = window.innerWidth < 768 ? "flex" : "none";
    }

    checkScreen();
    window.addEventListener("resize", checkScreen);

    /* ---------------- LOADING SCENE ---------------- */
    class LoadingScene extends Phaser.Scene {
      loadStartTime = 0;

      constructor() {
        super("LoadingScene");
      }

      preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor("#5FA8C9");

        const title = this.add
          .text(width / 2, height / 2 - 140, "Welcome to The lIttLe GuYs", {
            fontFamily: "Comic Sans MS",
            fontSize: "72px",
            color: "#ffffff",
            fontStyle: "bold",
            stroke: "#ffffff",
            strokeThickness: 3,
          })
          .setOrigin(0.5);

        this.tweens.add({
          targets: title,
          y: title.y - 25,
          duration: 4000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });

        const ball = this.add.circle(width / 2, height / 2 + 60, 40, 0xffffff);

        this.tweens.add({
          targets: ball,
          y: ball.y + 120,
          duration: 1000,
          ease: "Bounce.easeOut",
          yoyo: true,
          repeat: -1,
        });

        const progressBox = this.add.graphics();
        progressBox.fillStyle(0xffffff, 0.2);
        progressBox.fillRoundedRect(
          width / 2 - 200,
          height / 2 + 140,
          400,
          50,
          20,
        );

        const progressBar = this.add.graphics();

        this.load.on("progress", (value: number) => {
          progressBar.clear();
          progressBar.fillStyle(0xffffff, 1);
          progressBar.fillRoundedRect(
            width / 2 - 190,
            height / 2 + 150,
            380 * value,
            30,
            20,
          );
        });

        this.load.image("player", "/player.png");
        this.load.image("player_jump", "/player_jump.png");
        this.load.image("coin", "/coin.png");
        this.load.image("enemy", "/enemy.png");
        this.load.image(
          "ground",
          "https://labs.phaser.io/assets/sprites/platform.png",
        );

        this.loadStartTime = this.time.now;
      }

      create() {
        const elapsed = this.time.now - this.loadStartTime;
        const minTime = 2000;
        const remaining = Math.max(minTime - elapsed, 0);

        this.time.delayedCall(remaining, () => {
          this.scene.start("GameScene");
        });
      }
    }

    /* ---------------- GAME SCENE ---------------- */
    class GameScene extends Phaser.Scene {
      playerBody!: Phaser.Physics.Arcade.Sprite;
      playerWalkSprite!: Phaser.GameObjects.Image;
      playerJumpSprite!: Phaser.GameObjects.Image;
      cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      coins!: Phaser.Physics.Arcade.Group;
      enemies!: Phaser.Physics.Arcade.Group;
      score = 0;
      scoreText!: Phaser.GameObjects.Text;
      isGameOver = false;
      basePlayerWidth = 60;
      basePlayerHeight = 80;
      currentVisualState: "walk" | "jump" = "walk";

      // Tweak this single value if your PNG has a little transparent padding
      playerFootOffset = 6;

      constructor() {
        super("GameScene");
      }

      create() {
        this.isGameOver = false;
        this.score = 0;
        this.currentVisualState = "walk";

        this.physics.resume();
        this.physics.world.setBounds(0, 0, 4000, 800);

        const platforms = this.physics.add.staticGroup();

        for (let i = 0; i < 20; i++) {
          platforms
            .create(i * 200, 760, "ground")
            .setScale(2)
            .refreshBody();
        }

        platforms.create(600, 600, "ground");
        platforms.create(900, 500, "ground");
        platforms.create(1400, 650, "ground");
        platforms.create(1800, 550, "ground");
        platforms.create(2300, 600, "ground");

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        const floatingText = this.add
          .text(centerX, centerY, "tHe lIttLe gUys", {
            fontFamily: "Comic Sans MS",
            fontSize: "64px",
            fontStyle: "bold",
            color: "#ffffff",
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(-1);

        this.tweens.add({
          targets: floatingText,
          y: centerY - 20,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });

        // Invisible physics body
        this.playerBody = this.physics.add.sprite(200, 400, "player");
        this.playerBody.setVisible(false);
        this.playerBody.setBounce(0.1);
        this.playerBody.setCollideWorldBounds(true);

        // Body size tuned separately from visual size
        this.playerBody.setSize(36, 64);
        this.playerBody.setOffset(
          (this.playerBody.width - 36) / 2,
          this.playerBody.height - 64,
        );

        // Walking visual
        this.playerWalkSprite = this.add.image(200, 400, "player");
        this.playerWalkSprite.setDisplaySize(
          this.basePlayerWidth,
          this.basePlayerHeight,
        );
        this.playerWalkSprite.setOrigin(0.5, 1);

        // Jumping visual
        this.playerJumpSprite = this.add.image(200, 400, "player_jump");
        this.playerJumpSprite.setDisplaySize(
          this.basePlayerWidth,
          this.basePlayerHeight,
        );
        this.playerJumpSprite.setOrigin(0.5, 1);
        this.playerJumpSprite.setVisible(false);

        this.physics.add.collider(this.playerBody, platforms);

        this.cursors = this.input.keyboard!.createCursorKeys();

        this.cameras.main.startFollow(this.playerBody, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, 4000, 800);

        this.coins = this.physics.add.group();

        for (let i = 0; i < 25; i++) {
          const coin = this.coins.create(
            Phaser.Math.Between(200, 3800),
            0,
            "coin",
          );
          coin.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
          coin.setScale(0.3);
        }

        this.physics.add.collider(this.coins, platforms);

        this.physics.add.overlap(
          this.playerBody,
          this.coins,
          (_player, coin) => {
            coin.disableBody(true, true);
            this.score += 10;
            this.scoreText.setText("Score: " + this.score);
          },
          undefined,
          this,
        );

        this.enemies = this.physics.add.group();

        for (let i = 0; i < 8; i++) {
          const enemy = this.enemies.create(600 + i * 400, 200, "enemy");
          enemy.setBounce(1);
          enemy.setCollideWorldBounds(true);
          enemy.setVelocityX(Phaser.Math.Between(-120, 120));
          enemy.setScale(0.4);
        }

        this.physics.add.collider(this.enemies, platforms);
        this.physics.add.collider(
          this.playerBody,
          this.enemies,
          this.hitEnemy,
          undefined,
          this,
        );

        this.scoreText = this.add
          .text(20, 20, "Score: 0", {
            fontFamily: "Comic Sans MS",
            fontSize: "26px",
            color: "#ffffff",
          })
          .setScrollFactor(0);
      }

      syncVisualPlayer() {
        const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
        const footX = body.center.x;
        const footY = body.bottom + this.playerFootOffset;
        const flipX = this.playerBody.flipX;
        const rotation = this.playerBody.rotation;

        this.playerWalkSprite.setPosition(footX, footY);
        this.playerJumpSprite.setPosition(footX, footY);

        this.playerWalkSprite.setFlipX(flipX);
        this.playerJumpSprite.setFlipX(flipX);

        this.playerWalkSprite.setRotation(rotation);
        this.playerJumpSprite.setRotation(rotation);
      }

      setPlayerVisualState(nextState: "walk" | "jump") {
        if (this.currentVisualState === nextState) return;

        this.currentVisualState = nextState;

        if (nextState === "walk") {
          this.playerWalkSprite.setVisible(true);
          this.playerJumpSprite.setVisible(false);
        } else {
          this.playerWalkSprite.setVisible(false);
          this.playerJumpSprite.setVisible(true);
        }
      }

      hitEnemy() {
        if (this.isGameOver) return;

        this.isGameOver = true;
        this.physics.pause();

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add
          .text(centerX, centerY - 100, "GAME OVER", {
            fontFamily: "Comic Sans MS",
            fontSize: "64px",
            color: "#ffffff",
          })
          .setOrigin(0.5)
          .setScrollFactor(0);

        const button = this.add
          .rectangle(centerX, centerY + 20, 240, 80, 0x5fa8c9, 1)
          .setStrokeStyle(4, 0xffffff)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setScrollFactor(0);

        this.add
          .text(centerX, centerY + 20, "Restart Game", {
            fontFamily: "Comic Sans MS",
            fontSize: "28px",
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setScrollFactor(0);

        button.on("pointerdown", () => this.scene.restart());
      }

      update() {
        if (this.isGameOver) return;

        if (this.cursors.left.isDown) {
          this.playerBody.setVelocityX(-260);
          this.playerBody.setFlipX(true);
          this.playerBody.rotation = 0.15 * Math.sin(this.time.now * 0.005);
        } else if (this.cursors.right.isDown) {
          this.playerBody.setVelocityX(260);
          this.playerBody.setFlipX(false);
          this.playerBody.rotation = 0.15 * Math.sin(this.time.now * 0.005);
        } else {
          this.playerBody.setVelocityX(0);
          this.playerBody.rotation = Phaser.Math.Linear(
            this.playerBody.rotation,
            0,
            0.15,
          );
        }

        if (
          this.cursors.up.isDown &&
          ((this.playerBody.body as Phaser.Physics.Arcade.Body).blocked.down ||
            (this.playerBody.body as Phaser.Physics.Arcade.Body).touching.down)
        ) {
          this.playerBody.setVelocityY(-520);
        }

        const body = this.playerBody.body as Phaser.Physics.Arcade.Body;
        const isGrounded = body.blocked.down || body.touching.down;

        this.setPlayerVisualState(isGrounded ? "walk" : "jump");
        this.syncVisualPlayer();
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 900 },
        },
      },
      scene: [LoadingScene, GameScene],
      backgroundColor: "#5FA8C9",
      transparent: false,
      clearBeforeRender: true,
    };

    phaserInstance.current = new Phaser.Game(config);

    return () => {
      window.removeEventListener("resize", checkScreen);

      if (phaserInstance.current) {
        phaserInstance.current.destroy(true);
        phaserInstance.current = null;
      }

      if (gameRef.current) {
        gameRef.current.innerHTML = "";
      }

      initializedRef.current = false;
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{ position: "relative", width: "100%", height: "100vh" }}
    />
  );
}
