## Installation Guide 

# Step 1: Clone the Repository

cd /etc/
git clone https://github.com/AirlinkLabs/daemon.git
cd daemon

# Step 2: Set Permissions

sudo chown -R www-data:www-data /etc/daemon
sudo chmod -R 755 /etc/daemon

# Step 3: Install Dependencies

npm install -g typescript
npm install

# Step 4: Configure Environment

cp example.env .env

# Step 5: Build the Project

npm run build

# Step 6: Configure Settings

Access the control panel

Create an new node

And copy paste the configuration commands

# Step 7: Start the Daemon

npm run start 
