import {HexInfo} from '../Types'
import type {PlayStyle, ZombieStats, InfoSettings} from '../Types'
import Geomerty from '../utils/geometry'

export default class adjacentTracker implements PlayStyle{

    maxBlocks: number
    currentBlocks: boolean[]
    name = "adjacent";
    zombieStats: ZombieStats;
    zombieSettings: InfoSettings;
    hexes: HexInfo[];

    constructor (maxBlocks: number, size: number, settings: InfoSettings)
    {
        this.hexes = [];
        this.maxBlocks = maxBlocks;
        this.currentBlocks = [];
        for (let i = 0; i< maxBlocks; i++)
        {
            this.currentBlocks.push(false);
        }
        this.zombieStats = {
            infected: 0,
            susceptible: 0,
            safe: size
        }
        this.zombieSettings = settings;
    }
    
    hexClicked(mon: HexInfo, direction: number, hexes: HexInfo[])
    {
        if (direction == 1)
        {
            this.leftClick(mon, hexes)
        }
        else if (direction == -1)
        {
            this.rightClick(mon, hexes)
        }
    }

    leftClick(mon: HexInfo, hexes: HexInfo[])
    {
        if (mon.color > 2)
        {
            return this.DeselectMon(mon, hexes)
        }
        this.SelectMon(mon, hexes)
    }

    DeselectMon(mon: HexInfo, hexes: HexInfo[]){
        let neighbours = Geomerty.GetAdjacentHexes(mon, hexes)
        let connections = [] as HexInfo[];
        neighbours.forEach(neighbour => {
            if (neighbour.color == mon.color)
            {
                connections.push(neighbour);
            }
            if (neighbour.color <= 2)
            {
                let selected = Geomerty.GetAdjacentHexes(neighbour,hexes).find(a => a.color > 2)
               
                if (selected != null)
                {
                    this.zombieStats.susceptible--;
                }
                else
                {
                    this.zombieStats.safe--;
                }       
            }
        })

        if (connections.length == 0)
        {
            this.zombieStats.infected--;
            this.zombieStats.safe++;
            this.currentBlocks[mon.color-3] = false;
            mon.color = 0;
        }
        else if (connections.length == 1)
        {
            this.zombieStats.infected--;
            this.zombieStats.susceptible++;
            mon.color = 1;
        }
        else
        {
            mon.color = 1;
            this.zombieStats.infected--;
            this.zombieStats.susceptible++;

            while (connections.length > 0)
            {
                let connection = connections.pop()
                let block = Geomerty.GetColorBlock(connection!,hexes)
                
                let outBlock = [] as HexInfo[]

                connections.forEach(a => {
                    if (block.find(b => a.location.index == b.location.index) == null)
                    {
                        outBlock.push(a)
                    }
                })

                if (outBlock.length != 0)
                {
                    let newBlock = this.maxBlocks

                    for (let i = 1; i < this.maxBlocks; i++)
                    {
                        if (!this.currentBlocks[i-1])
                        {
                            newBlock = i;
                            break;
                        }
                    }
    
                    this.currentBlocks[newBlock - 1] = true
                    block.forEach(b => {
                        b.color = newBlock + 2;
                    })
                }

                connections = outBlock
            }
        }

        neighbours.forEach(neighbour => {
            if (neighbour.color <= 2)
            {
                let selected = Geomerty.GetAdjacentHexes(neighbour,hexes).find(a => a.color > 2)
               
                if (selected != null)
                {
                    this.zombieStats.susceptible++;
                    if (neighbour.color < 2)
                    {
                        neighbour.color = 1
                    }
                }
                else
                {
                    this.zombieStats.safe++;
                    if (neighbour.color < 2)
                    {
                    neighbour.color = 0
                    }
                }
                
            }
        })
        return;
    }

    SelectMon(mon: HexInfo, hexes: HexInfo[]){

        let adjacentBlocks = [] as number[];
        let neighbours = Geomerty.GetAdjacentHexes(mon, hexes)
        
        neighbours.forEach(neighbour => {
            if (neighbour.color == 0)
            {
                neighbour.color = 1;
                this.zombieStats.susceptible++;
                this.zombieStats.safe--;
            }
            if (neighbour.color == 2)
            {
                this.zombieStats.susceptible++;
                this.zombieStats.safe--;
            }
            else if (neighbour.color > 2 && !adjacentBlocks.includes(neighbour.color))
            {
                adjacentBlocks.push(neighbour.color)
            }
        } )

        if (adjacentBlocks.length == 0)
        {
            let block = this.maxBlocks

            for (let i = 1; i < this.maxBlocks; i++)
            {
                if (!this.currentBlocks[i-1])
                {
                    block = i;
                    break;
                }
            }

            this.zombieStats.infected++;
            this.zombieStats.safe--;
            this.currentBlocks[block - 1] = true
            mon.color = block + 2;
        }
        else if (adjacentBlocks.length == 1)
        {
            this.zombieStats.susceptible--;
            this.zombieStats.infected++;
            mon.color = adjacentBlocks[0];
        }
        else{
            mon.color = adjacentBlocks[0];
            this.zombieStats.susceptible--;
            this.zombieStats.infected++;

            for (let i = 1; i < adjacentBlocks.length; i++)
            {
                this.currentBlocks[adjacentBlocks[i] - 3] = false
                hexes.filter(hex => hex.color == adjacentBlocks[i]).forEach( oldHex => {
                    oldHex.color = adjacentBlocks[0];
                })
            }
        }
    }

    Infect() {
        for (let i = 0; i < this.maxBlocks; i++)
        {
            if (this.currentBlocks[i])
            {
                this.RunInfect(i);
            }
        }

        for (let i = 0; i < this.maxBlocks - 1; i++)
        {
            if (this.currentBlocks[i])
            {
                this.CombineBreakout(i);
            }
        }
    
        this.zombieStats.infected = 0;
        this.zombieStats.susceptible = 0;
        this.zombieStats.safe = 0;

        this.hexes.forEach((hex) => {
            if (hex.color >= 3)
            {
                this.zombieStats.infected++;
            }
            else
            {
                let neigbours = Geomerty.GetAdjacentHexes(hex,this.hexes)
                let infected = neigbours.find(x => x.color >= 3)
                if (infected != null)
                {
                    if (hex.color == 0)
                    {
                        hex.color = 1;
                    }
                    this.zombieStats.susceptible++;
                }
                else
                {
                    this.zombieStats.safe++;
                }
            }
        });

    }

    RunInfect(color: number)
    {
        let block = this.hexes.filter((hex) => hex.color == color + 3);

        let surrounds = [] as HexInfo[];
        block.forEach((hex) => {
            let neighbours = Geomerty.GetAdjacentHexes(hex,this.hexes);
            neighbours.forEach((neighbour) => {

                let found = surrounds.find(x => x.dexNumber == neighbour.dexNumber)
                if (found == null)
                {
                    found = block.find(x => x.dexNumber == neighbour.dexNumber)
                }

                if (found == null)
                {
                    surrounds.push(neighbour);
                }
            });
        });

        surrounds.forEach((hex) => {
            hex.color = color+3;
        })
    }

    CombineBreakout(color: number)
    {
        let block = this.hexes.filter((hex) => hex.color == color + 3);

        let surrounds = [] as number[];
        block.forEach((hex) => {
            let neighbours = Geomerty.GetAdjacentHexes(hex,this.hexes);
            neighbours.forEach((neighbour) => {

                if (neighbour.color > color + 3 && !surrounds.includes(neighbour.color))
                {
                    surrounds.push(neighbour.color);
                }
            });
        });

        let replacments = this.hexes.filter((hex) => surrounds.includes(hex.color));
        replacments.forEach((hex) => hex.color = color + 3)

        surrounds.forEach(x => {this.currentBlocks[x-3] = false})

    }


    rightClick(mon: HexInfo, hexes: HexInfo[]){
        if (mon.color > 2)
        {
            return;
        }

        if (mon.color < 2)
        {
            mon.color = 2
            return;
        }
        
        mon.color = 0;
        Geomerty.GetAdjacentHexes(mon, hexes).forEach( neighbour => {
            if (neighbour.color > 2)
            {
                mon.color = 1
            }
        });
    }
}
